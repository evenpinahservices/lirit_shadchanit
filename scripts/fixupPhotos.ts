/**
 * Scans all clients in the lirit DB that have a photoUrl set.
 * Sends each image to Gemini and asks: PORTRAIT or DOCUMENT?
 * Clears photoUrl on any client whose photo is a CV/document.
 *
 * Run with: npx tsx scripts/fixupPhotos.ts
 * Dry run:  npx tsx scripts/fixupPhotos.ts --dry-run
 */

import mongoose, { Schema } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }
if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const DRY_RUN = process.argv.includes("--dry-run");

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

// ── Gemini ────────────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
    { model: "gemini-2.5-flash", api: "v1beta" },
    { model: "gemini-2.0-flash", api: "v1beta" },
    { model: "gemini-2.0-flash-001", api: "v1beta" },
];

const GEMINI_MIN_GAP_MS = 4000;
let lastGeminiCallAt = 0;
const geminiQueue: Array<() => void> = [];
let geminiQueueRunning = false;

function drainGeminiQueue() {
    if (geminiQueue.length === 0) { geminiQueueRunning = false; return; }
    geminiQueueRunning = true;
    const wait = Math.max(0, lastGeminiCallAt + GEMINI_MIN_GAP_MS - Date.now());
    setTimeout(() => {
        lastGeminiCallAt = Date.now();
        geminiQueue.shift()!();
        drainGeminiQueue();
    }, wait);
}

async function geminiRateGate(): Promise<void> {
    return new Promise(resolve => {
        geminiQueue.push(resolve);
        if (!geminiQueueRunning) drainGeminiQueue();
    });
}

async function classifyImage(imageUrl: string): Promise<"PORTRAIT" | "DOCUMENT" | "ERROR"> {
    // Fetch image and convert to base64
    let mimeType: string;
    let base64: string;
    try {
        const res = await fetch(imageUrl, { cache: "no-store" });
        if (!res.ok) return "ERROR";
        const buf = Buffer.from(await res.arrayBuffer());
        base64 = buf.toString("base64");
        mimeType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    } catch {
        return "ERROR";
    }

    const prompt = `Classify this image as exactly one of:
PORTRAIT — a standalone photograph of a person (face/body is the primary content, little or no text)
DOCUMENT — a resume, CV, bio form, or any image where text/forms are the primary content (even if it contains a small embedded photo)

Reply with a single word: PORTRAIT or DOCUMENT`;

    const parts = [
        { text: prompt },
        { inlineData: { mimeType, data: base64 } },
    ];

    await geminiRateGate();

    for (const { model, api } of GEMINI_MODELS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
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
            if (res.status === 404) continue;
            if (!res.ok) return "ERROR";
            const data = await res.json();
            const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toUpperCase();
            if (text.includes("PORTRAIT")) return "PORTRAIT";
            if (text.includes("DOCUMENT")) return "DOCUMENT";
            return "ERROR";
        } catch {
            continue;
        }
    }
    return "ERROR";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (DRY_RUN) console.log("🔍  DRY RUN — no changes will be written\n");

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb("lirit", { useCache: true });
    const Client = db.models["Client"] || db.model("Client", LooseSchema);

    const clients = await (Client as any).find({ photoUrl: { $exists: true, $ne: "" } }).lean();
    console.log(`Found ${clients.length} clients with a photoUrl\n`);

    let cleared = 0, kept = 0, errors = 0;

    for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const label = `[${i + 1}/${clients.length}] ${String(client.fullName ?? client._id).substring(0, 28).padEnd(28)}`;
        process.stdout.write(`  ${label} checking…`);

        const result = await classifyImage(client.photoUrl);

        if (result === "DOCUMENT") {
            process.stdout.write(`\r  ${label} ✗ DOCUMENT — clearing photoUrl\n`);
            if (!DRY_RUN) {
                await (Client as any).updateOne({ _id: client._id }, { $unset: { photoUrl: "" } });
            }
            cleared++;
        } else if (result === "PORTRAIT") {
            process.stdout.write(`\r  ${label} ✓ portrait\n`);
            kept++;
        } else {
            process.stdout.write(`\r  ${label} ? error fetching/classifying\n`);
            errors++;
        }
    }

    console.log(`\n✅  Done`);
    console.log(`   Portraits kept:    ${kept}`);
    console.log(`   CV photos cleared: ${cleared}`);
    console.log(`   Errors skipped:    ${errors}`);
    if (DRY_RUN) console.log("\n   (dry run — nothing written)");

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
