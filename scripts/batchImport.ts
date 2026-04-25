/**
 * Batch import profiles from the profiles/ folder into the lirit MongoDB database.
 *
 * Folder structure expected:
 *   profiles/girls/0 added girls/Profile 001/  ← images live here
 *   profiles/boys/0 added boys/Profile 001/    ← when ready
 *
 * After each profile is saved, its folder is moved to profiles/girls/done/Profile 001/
 * so the script is safe to re-run without duplicating anything.
 *
 * Usage:
 *   npx tsx scripts/batchImport.ts            # import all
 *   npx tsx scripts/batchImport.ts --test 5   # import first 5 only
 */

import mongoose, { Schema, Connection } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ── Config ───────────────────────────────────────────────────────────────────

const PROFILES_ROOT = path.resolve(__dirname, "../profiles");
const PROMPT_PATH = path.resolve(__dirname, "../src/prompts/data-extraction-prompt.txt");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MONGODB_URI = process.env.MONGODB_URI!;

const testArgIdx = process.argv.indexOf("--test");
const TEST_LIMIT = testArgIdx !== -1 ? parseInt(process.argv[testArgIdx + 1], 10) : null;

const genderArgIdx = process.argv.indexOf("--gender");
const GENDER_FILTER = genderArgIdx !== -1
    ? (process.argv[genderArgIdx + 1]?.toLowerCase().startsWith("m") ? "Male" : "Female")
    : null; // null = both

// ── Cloudinary ────────────────────────────────────────────────────────────────

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(filePath: string): Promise<string> {
    const result = await cloudinary.uploader.upload(filePath, {
        folder: "shadchanit_clients",
        resource_type: "image",
    });
    return result.secure_url;
}

// ── MongoDB ───────────────────────────────────────────────────────────────────

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

async function connectLiritDb(): Promise<Connection> {
    await mongoose.connect(MONGODB_URI);
    return mongoose.connection.useDb("lirit", { useCache: true });
}

// ── Gemini helpers ────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
    { model: "gemini-2.5-flash", api: "v1beta" },
    { model: "gemini-2.0-flash", api: "v1beta" },
    { model: "gemini-2.0-flash-001", api: "v1beta" },
];

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
              ".webp": "image/webp", ".heic": "image/heic", ".heif": "image/heif" } as any)[ext] ?? "image/jpeg";
}

async function imageToBase64(filePath: string): Promise<{ mimeType: string; data: string }> {
    const buffer = await fs.readFile(filePath);
    return { mimeType: getMimeType(filePath), data: buffer.toString("base64") };
}

// Global rate limiter: space Gemini calls at least GEMINI_MIN_GAP_MS apart
const GEMINI_MIN_GAP_MS = 3000; // ~20 RPM ceiling
let lastGeminiCallAt = 0;
const geminiQueue: Array<() => void> = [];
let geminiQueueRunning = false;

async function geminiRateGate(): Promise<void> {
    return new Promise(resolve => {
        geminiQueue.push(resolve);
        if (!geminiQueueRunning) drainGeminiQueue();
    });
}

function drainGeminiQueue() {
    if (geminiQueue.length === 0) { geminiQueueRunning = false; return; }
    geminiQueueRunning = true;
    const wait = Math.max(0, lastGeminiCallAt + GEMINI_MIN_GAP_MS - Date.now());
    setTimeout(() => {
        lastGeminiCallAt = Date.now();
        const resolve = geminiQueue.shift()!;
        resolve();
        drainGeminiQueue();
    }, wait);
}

async function callGemini(parts: any[], retries = 2): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 20000));
        await geminiRateGate();

        let lastErr = "";
        for (const { model, api } of GEMINI_MODELS) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout
                let res: Response;
                try {
                    res = await fetch(
                        `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                        { method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ contents: [{ parts }] }),
                          signal: controller.signal }
                    );
                } finally {
                    clearTimeout(timeout);
                }
                if (res.status === 404) { lastErr = `${model} not found`; continue; }
                if (res.status === 429) { lastErr = `${model} rate-limited`; break; }
                if (!res.ok) throw new Error(`Gemini ${model} error (${res.status}): ${(await res.text()).substring(0, 200)}`);
                const data = await res.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            } catch (err: any) {
                if (err.message?.startsWith("Gemini")) throw err;
                lastErr = `${model}: ${err.cause?.message ?? err.message}`;
                break;
            }
        }
        if (attempt === retries) throw new Error(`Gemini failed after ${retries + 1} attempts. Last: ${lastErr}`);
    }
    throw new Error("Gemini: unexpected exit");
}

// ── Combined: select photo + extract data in one Gemini call ─────────────────

const PHOTO_SELECTION_PREFIX = `TASK — SELECT PROFILE PHOTO (do this before extracting data):

Examine each image (0-indexed in the order provided) and classify it as one of:
  PORTRAIT — The entire image IS a photograph of a person. Face/body is the main content. Little or no text overlay.
  DOCUMENT — A resume, CV, bio form, or any image where text / form fields / handwriting are the primary content.
              A document that contains a small embedded passport photo is still a DOCUMENT, NOT a portrait.

Selection rules (strict priority order):
  1. NEVER select a DOCUMENT image, even if a face is visible within it.
  2. If ANY PORTRAIT images exist, you MUST select one — returning null when a portrait is present is incorrect.
     If there is only one PORTRAIT image, select it regardless of quality.
     If there are multiple PORTRAIT images, pick the best: face clearly visible and centered, clean background, forward-facing, sole subject.
  3. Return null ONLY when every single image is a DOCUMENT with no standalone portrait at all.

Add to your JSON output:
  "selectedPhotoIndex": <0-based integer index of the best PORTRAIT, or null ONLY if zero portraits exist>

---

`;

async function extractProfileDataAndSelectPhoto(
    imagePaths: string[],
    retries = 2
): Promise<{ data: Record<string, unknown>; photoIndex: number | null }> {
    const extractionPrompt = await fs.readFile(PROMPT_PATH, "utf-8");
    const combinedPrompt = PHOTO_SELECTION_PREFIX + extractionPrompt;

    const parts: any[] = [{ text: combinedPrompt }];
    for (const imgPath of imagePaths) {
        const b64 = await imageToBase64(imgPath);
        parts.push({ inlineData: { mimeType: b64.mimeType, data: b64.data } });
    }

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 10000));
        try {
            const text = await callGemini(parts);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Gemini returned no JSON");
            const parsed = JSON.parse(jsonMatch[0]);
            const rawIdx = parsed.selectedPhotoIndex;
            const photoIndex = (rawIdx === null || rawIdx === undefined)
                ? null
                : (typeof rawIdx === "number" && rawIdx >= 0 && rawIdx < imagePaths.length ? rawIdx : null);
            delete parsed.selectedPhotoIndex;
            return { data: parsed, photoIndex };
        } catch (err: any) {
            lastErr = err;
        }
    }
    throw lastErr!;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(name: string): string {
    return name.split(/\s+/).map(word => {
        if (!word) return word;
        if (/[֐-׿]/.test(word)) return word; // Hebrew — no case change
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
}

function isValidDob(dob: unknown): boolean {
    if (!dob || dob === "NaN" || dob === "null" || dob === "undefined") return false;
    const s = String(dob).trim();
    if (!s) return false;
    // Accept plain year (4 digits) or parseable date string
    const year = s.length <= 4 ? parseInt(s, 10) : new Date(s).getFullYear();
    return !isNaN(year) && year >= 1900 && year < new Date().getFullYear();
}

// ── Step 3: Flatten AI data to DB shape ───────────────────────────────────────

function extractVal(field: unknown): unknown {
    if (field == null) return field;
    if (typeof field === "object" && !Array.isArray(field) && "value" in (field as any))
        return extractVal((field as any).value);
    if (Array.isArray(field))
        return (field as any[]).map(item =>
            typeof item === "object" && item !== null && "value" in item ? item.value : item);
    return field;
}

const CLIENT_KEYS = [
    "fullName", "email", "phone", "dob", "location", "gender",
    "height", "eyeColor", "hairColor",
    "ethnicity", "tribalStatus", "religiousAffiliation", "learningStatus", "maritalStatus", "children",
    "languages", "familyBackground", "education", "occupationTitle", "occupationDescription",
    "smoking", "headCovering", "religiousDetailsFreeText",
    "hobbies", "personality", "medicalHistory", "medicalHistoryDetails",
    "willingToRelocate", "ageGapPreference", "preferredEthnicities", "preferredHashkafos",
    "preferredLearningStatus", "preferredHeadCovering", "preferencesFreeText",
    "references", "notes", "resumeRawText", "formLanguage",
];

function flattenForDb(
    aiData: Record<string, unknown>,
    galleryUrls: string[],
    profilePhotoUrl: string | null,
    gender: "Male" | "Female",
    profileName: string
): Record<string, unknown> {
    const flat: Record<string, unknown> = {};

    for (const key of CLIENT_KEYS) {
        const raw = aiData[key];
        if (raw === undefined) continue;
        const value = extractVal(raw);
        if (value === undefined || value === null || value === "") continue;
        flat[key] = value;
    }

    // Images
    flat.galleryImages = galleryUrls;
    if (profilePhotoUrl) flat.photoUrl = profilePhotoUrl;

    // Gender always comes from folder, not AI
    flat.gender = gender;

    // Title-case the name
    if (flat.fullName && typeof flat.fullName === "string") {
        flat.fullName = toTitleCase(flat.fullName.trim());
    }

    // Default location to Israel if missing
    if (!flat.location || String(flat.location).trim() === "") {
        flat.location = "Israel";
    }

    // Coerce booleans
    if (flat.medicalHistory !== undefined) {
        const v = String(flat.medicalHistory).toLowerCase();
        flat.medicalHistory = v === "true" || v === "yes" || v === "1";
    }

    // Clear invalid dob so the age fallback can run
    if (!isValidDob(flat.dob)) delete flat.dob;

    // Age → birth year fallback when dob missing or invalid
    if (flat.dob === undefined) {
        const rawAge = aiData.age;
        const ageVal = rawAge != null && typeof rawAge === "object" && "value" in (rawAge as any)
            ? (rawAge as any).value : rawAge;
        const ageNum = Number(ageVal);
        if (ageNum >= 18 && ageNum <= 60)
            flat.dob = String(new Date().getFullYear() - ageNum);
    }

    // Append extended AI fields to text columns
    const extractStr = (f: unknown): string | null => {
        if (f == null) return null;
        if (typeof f === "object" && "value" in (f as any)) {
            const v = (f as any).value;
            return v != null ? String(v).trim() || null : null;
        }
        return String(f).trim() || null;
    };
    const append = (key: string, extra: string) => {
        const existing = flat[key] ? String(flat[key]).trim() : "";
        flat[key] = existing ? `${existing}\n${extra}` : extra;
    };

    const father = aiData.fatherDetails;
    const mother = aiData.motherDetails;
    const siblings = extractStr(aiData.siblingsCount);
    const shadchan = extractStr(aiData.shadchanName);

    if (father && typeof father === "object") {
        const fv = "value" in (father as any) ? (father as any).value : father;
        const fName = fv?.name ? extractStr(fv.name) : null;
        const fOcc = fv?.occupation ? extractStr(fv.occupation) : null;
        if (fName || fOcc) append("familyBackground", `Father: ${[fName, fOcc].filter(Boolean).join(" – ")}`);
    }
    if (mother && typeof mother === "object") {
        const mv = "value" in (mother as any) ? (mother as any).value : mother;
        const mName = mv?.name ? extractStr(mv.name) : null;
        const mOcc = mv?.occupation ? extractStr(mv.occupation) : null;
        if (mName || mOcc) append("familyBackground", `Mother: ${[mName, mOcc].filter(Boolean).join(" – ")}`);
    }
    if (siblings) append("familyBackground", `Siblings: ${siblings}`);
    if (shadchan) append("references", `Shadchan: ${shadchan}`);

    // Language detection
    if (!flat.formLanguage) {
        let he = 0, en = 0;
        for (const key of ["fullName", "familyBackground", "personality", "hobbies"]) {
            if (flat[key]) {
                const t = String(flat[key]);
                he += (t.match(/[֐-׿]/g) || []).length;
                en += (t.match(/[a-zA-Z]/g) || []).length;
            }
        }
        flat.formLanguage = he > en ? "he" : "en";
    }

    // Required field fallbacks — use "Unknown" if AI couldn't extract one; leave dob empty (UI shows N/A)
    if (!flat.fullName || String(flat.fullName).trim() === "") flat.fullName = "Unnamed";

    flat.active = true;
    flat.createdAt = new Date().toISOString().split("T")[0];

    return flat;
}

// ── Output helpers ────────────────────────────────────────────────────────────

function fmtEta(elapsedSec: number, done: number, total: number): string {
    if (done === 0) return "…";
    const etaSec = Math.round((elapsedSec / done) * (total - done));
    return etaSec > 3600 ? `${Math.floor(etaSec/3600)}h ${Math.floor((etaSec%3600)/60)}m`
         : etaSec > 60   ? `${Math.floor(etaSec/60)}m ${etaSec%60}s`
         : `${etaSec}s`;
}

function printBar(done: number, total: number, startMs: number): void {
    const pct = done / total;
    const filled = Math.round(pct * 30);
    const bar = "█".repeat(filled) + "░".repeat(30 - filled);
    const elapsed = (Date.now() - startMs) / 1000;
    process.stdout.write(`\r[${done}/${total}] ${bar} ${Math.round(pct*100)}% | ETA: ${fmtEta(elapsed, done, total)}   `);
}

// ── Folder scanning ───────────────────────────────────────────────────────────

interface ProfileEntry {
    profileDir: string;
    profileName: string;
    gender: "Male" | "Female";
    doneDir: string;
}

const IMAGE_EXTS_RE = /\.(jpg|jpeg|png|webp|heic|heif)$/i;

async function folderHasImages(dirPath: string): Promise<boolean> {
    const items = await fs.readdir(dirPath);
    return items.some(f => IMAGE_EXTS_RE.test(f));
}

async function scanProfiles(): Promise<ProfileEntry[]> {
    const entries: ProfileEntry[] = [];
    const genderMap: { subdir: string; gender: "Male" | "Female" }[] = [
        { subdir: "girls", gender: "Female" },
        { subdir: "boys",  gender: "Male"   },
    ];

    for (const { subdir, gender } of genderMap) {
        const genderPath = path.join(PROFILES_ROOT, subdir);
        try { await fs.access(genderPath); } catch { continue; }

        const donePath = path.join(genderPath, "done");
        const firstLevel = (await fs.readdir(genderPath))
            .filter(n => n.toLowerCase() !== "done")
            .sort();

        for (const name of firstLevel) {
            const fullPath = path.join(genderPath, name);
            if (!(await fs.stat(fullPath)).isDirectory()) continue;

            if (await folderHasImages(fullPath)) {
                // Direct profile folder (e.g. girls/Profile 065/, girls/Chany Samsonowitz/)
                entries.push({ profileDir: fullPath, profileName: name, gender, doneDir: donePath });
            } else {
                // Staging folder (e.g. girls/0 added girls/) — profiles are one level deeper
                const profileNames = (await fs.readdir(fullPath)).sort();
                for (const profileName of profileNames) {
                    const profilePath = path.join(fullPath, profileName);
                    if (!(await fs.stat(profilePath)).isDirectory()) continue;
                    entries.push({ profileDir: profilePath, profileName, gender, doneDir: donePath });
                }
            }
        }
    }

    return entries;
}

// ── Process one profile ───────────────────────────────────────────────────────

async function processProfile(entry: ProfileEntry, ClientModel: any): Promise<{ photoIndex: number; imgCount: number }> {
    const { profileDir, profileName, gender, doneDir } = entry;

    const imagePaths = (await fs.readdir(profileDir))
        .filter(f => IMAGE_EXTS_RE.test(f))
        .sort()
        .map(f => path.join(profileDir, f));

    if (imagePaths.length === 0) throw new Error("No images found");

    // Upload all images in parallel
    const galleryUrls = await Promise.all(imagePaths.map(f => uploadToCloudinary(f)));

    // Select profile photo + extract data in one AI call
    const { data: aiData, photoIndex } = await extractProfileDataAndSelectPhoto(imagePaths);
    const profilePhotoUrl = photoIndex !== null ? galleryUrls[photoIndex] : null;

    // Flatten and save
    const clientData = flattenForDb(aiData, galleryUrls, profilePhotoUrl, gender, profileName);
    const doc = new ClientModel(clientData);
    await doc.save();

    // Move to done/
    await fs.mkdir(doneDir, { recursive: true });
    await fs.rename(profileDir, path.join(doneDir, profileName));

    return { photoIndex: photoIndex ?? -1, imgCount: imagePaths.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY not set in .env.local"); process.exit(1); }
    if (!MONGODB_URI)    { console.error("MONGODB_URI not set in .env.local");    process.exit(1); }

    // Parse --concurrency N (default 5)
    const concArgIdx = process.argv.indexOf("--concurrency");
    const CONCURRENCY = concArgIdx !== -1 ? Math.min(parseInt(process.argv[concArgIdx + 1], 10), 10) : 5;

    const allProfiles = await scanProfiles();
    if (allProfiles.length === 0) {
        console.log("No profiles found. Make sure profiles/girls/ or profiles/boys/ exist.");
        return;
    }

    const filtered = GENDER_FILTER ? allProfiles.filter(p => p.gender === GENDER_FILTER) : allProfiles;
    const profiles = TEST_LIMIT ? filtered.slice(0, TEST_LIMIT) : filtered;
    const genderLabel = GENDER_FILTER ? ` [${GENDER_FILTER} only]` : "";
    console.log(`\n🚀  Batch Import — ${profiles.length} profile${profiles.length !== 1 ? "s" : ""}${TEST_LIMIT ? ` (first ${TEST_LIMIT})` : ""}${genderLabel}`);
    console.log(`    Database: lirit  |  Concurrency: ${CONCURRENCY}  |  All images → Cloudinary\n`);

    const liritConn = await connectLiritDb();
    const ClientModel = liritConn.models["Client"] || liritConn.model("Client", LooseSchema);

    let succeeded = 0, failed = 0, completed = 0;
    const errors: { name: string; error: string }[] = [];
    const startMs = Date.now();
    const total = profiles.length;

    // Worker pool: CONCURRENCY workers each grab the next profile
    let nextIdx = 0;
    const logLines: string[] = [];

    function logLine(line: string) {
        process.stdout.write(`\r${" ".repeat(70)}\r`); // clear progress bar line
        console.log(line);
        printBar(completed, total, startMs);
    }

    async function worker() {
        while (true) {
            const i = nextIdx++;
            if (i >= total) break;
            const entry = profiles[i];
            const t0 = Date.now();
            try {
                const { photoIndex, imgCount } = await processProfile(entry, ClientModel);
                succeeded++;
                completed++;
                const sec = Math.round((Date.now() - t0) / 1000);
                const photoLabel = photoIndex === -1 ? "no-face" : `photo:${photoIndex + 1}`;
                logLine(`  ✓ [${completed}/${total}] ${entry.profileName.padEnd(20)} ${entry.gender === "Female" ? "♀" : "♂"}  ${imgCount} img${imgCount>1?"s":" "}  ${photoLabel}  ${sec}s`);
            } catch (err: any) {
                failed++;
                completed++;
                const errMsg = err?.message ?? String(err) ?? "unknown error";
                errors.push({ name: entry.profileName, error: errMsg });
                logLine(`  ✗ [${completed}/${total}] ${entry.profileName} — ${errMsg}`);
            }
        }
    }

    printBar(0, total, startMs);
    // Stagger worker startup by 3s each so Gemini calls don't all land at the same instant
    await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, i) =>
            new Promise<void>(r => setTimeout(r, i * 3000)).then(() => worker())
        )
    );

    const elapsedSec = Math.round((Date.now() - startMs) / 1000);
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    const timeStr = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;

    process.stdout.write("\r" + " ".repeat(70) + "\r");
    console.log(`\n✅  Done in ${timeStr} — ${succeeded} imported, ${failed} failed`);

    if (errors.length > 0) {
        console.log("\nFailed profiles:");
        for (const e of errors) console.log(`  ✗ ${e.name}: ${e.error}`);
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error("\nFatal:", err.message);
    process.exit(1);
});
