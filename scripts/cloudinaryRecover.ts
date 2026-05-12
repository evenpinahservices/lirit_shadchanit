/**
 * Download images from the Cloudinary manifest and organize them into profile
 * folders so the existing batchImport.ts can re-process them.
 *
 * Reads scripts/cloudinary-manifest.json (produced by cloudinaryAudit.ts).
 * Downloads each group's images to:
 *   profiles/recovered/Group_001/image1.jpg ...
 *
 * Gender is unknown at this point — batchImport will use AI-extracted gender
 * for folders under profiles/recovered/ (see the --recovered flag on batchImport).
 *
 * Usage:
 *   npx tsx scripts/cloudinaryRecover.ts                    # all groups
 *   npx tsx scripts/cloudinaryRecover.ts --min-images 2     # skip single-image groups
 *   npx tsx scripts/cloudinaryRecover.ts --dry-run          # show what would happen, no download
 *   npx tsx scripts/cloudinaryRecover.ts --skip-dedup       # skip DB duplicate check
 *
 * After this script completes, review profiles/recovered/ in File Explorer,
 * manually rename/move any mis-grouped folders if needed, then run:
 *   npx tsx scripts/batchImport.ts --recovered
 */

import mongoose, { Schema, Connection } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";
import * as https from "https";
import * as http from "http";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MANIFEST_PATH = path.resolve(__dirname, "cloudinary-manifest.json");
const RECOVERED_ROOT = path.resolve(__dirname, "../profiles/recovered");
const MONGODB_URI = process.env.MONGODB_URI!;

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN     = process.argv.includes("--dry-run");
const SKIP_DEDUP  = process.argv.includes("--skip-dedup");

const minImgArgIdx = process.argv.indexOf("--min-images");
const MIN_IMAGES = minImgArgIdx !== -1 ? parseInt(process.argv[minImgArgIdx + 1], 10) : 1;

// ── MongoDB ───────────────────────────────────────────────────────────────────

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

async function connectLiritDb(): Promise<Connection> {
    await mongoose.connect(MONGODB_URI);
    return mongoose.connection.useDb("lirit", { useCache: true });
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getExistingNames(ClientModel: any): Promise<Set<string>> {
    const clients = await ClientModel.find({}, { fullName: 1 }).lean();
    return new Set(clients.map((c: any) => normalizeName(c.fullName ?? "")));
}

// ── Download ──────────────────────────────────────────────────────────────────

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;
        const file = require("fs").createWriteStream(destPath);
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                reject(new Error(`HTTP ${response.statusCode} for ${url}`));
                return;
            }
            response.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", (err) => {
            file.close();
            reject(err);
        });
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface ManifestAsset {
    url: string;
    public_id: string;
    bytes: number;
    format: string;
}

interface ManifestGroup {
    groupId: string;
    folder: string;
    firstUploadAt: string;
    lastUploadAt: string;
    imageCount: number;
    assets: ManifestAsset[];
}

interface Manifest {
    generatedAt: string;
    fromDate: string;
    gapSeconds: number;
    totalAssets: number;
    totalGroups: number;
    groups: ManifestGroup[];
}

async function main() {
    // Load manifest
    let manifest: Manifest;
    try {
        const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
        manifest = JSON.parse(raw);
    } catch {
        console.error("Manifest not found. Run cloudinaryAudit.ts first.");
        process.exit(1);
    }

    const groups = manifest.groups.filter(g => g.imageCount >= MIN_IMAGES);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║              Cloudinary Recovery                             ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
    console.log(`  Manifest date  : ${manifest.generatedAt.substring(0, 10)}`);
    console.log(`  Total groups   : ${manifest.totalGroups}`);
    console.log(`  After filter   : ${groups.length} groups (min ${MIN_IMAGES} image${MIN_IMAGES !== 1 ? "s" : ""})`);
    console.log(`  Mode           : ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);

    // Duplicate check
    let existingNames = new Set<string>();
    let liritConn: Connection | null = null;

    if (!SKIP_DEDUP && MONGODB_URI) {
        process.stdout.write("\n  Connecting to MongoDB for duplicate check...");
        liritConn = await connectLiritDb();
        const ClientModel = liritConn.models["Client"] || liritConn.model("Client", LooseSchema);
        existingNames = await getExistingNames(ClientModel);
        console.log(` ${existingNames.size} existing clients loaded`);
    } else if (SKIP_DEDUP) {
        console.log("\n  Skipping duplicate check (--skip-dedup)");
    } else {
        console.log("\n  ⚠  MONGODB_URI not set — skipping duplicate check");
    }

    // Create root folder
    if (!DRY_RUN) {
        await fs.mkdir(RECOVERED_ROOT, { recursive: true });
    }

    console.log(`\n  Downloading to: profiles/recovered/\n`);

    let downloaded = 0, skippedDedup = 0, skippedExists = 0, failed = 0;
    const dupLog: string[] = [];

    for (const group of groups) {
        const groupDir = path.join(RECOVERED_ROOT, group.groupId);

        // Skip if already downloaded
        try {
            await fs.access(groupDir);
            skippedExists++;
            continue;
        } catch { /* not yet downloaded, proceed */ }

        const label = `[${group.groupId}]  ${group.firstUploadAt.substring(0, 10)}  ${group.imageCount} img  [${group.folder}]`;

        if (DRY_RUN) {
            console.log(`  ○ ${label}`);
            downloaded++;
            continue;
        }

        try {
            await fs.mkdir(groupDir, { recursive: true });

            // Download all images for this group
            await Promise.all(
                group.assets.map(async (asset, i) => {
                    const ext = asset.format || "jpg";
                    const filename = `image_${String(i + 1).padStart(2, "0")}.${ext}`;
                    await downloadFile(asset.url, path.join(groupDir, filename));
                })
            );

            console.log(`  ✓ ${label}`);
            downloaded++;
        } catch (err: any) {
            console.log(`  ✗ ${label} — ${err.message}`);
            failed++;
            // Remove partial folder
            try { await fs.rm(groupDir, { recursive: true, force: true }); } catch {}
        }
    }

    if (liritConn) await mongoose.disconnect();

    // Summary
    console.log("\n──────────────────────────────────────────────────────────────");
    console.log(`  Downloaded    : ${downloaded}`);
    if (skippedExists > 0) console.log(`  Already exists: ${skippedExists} (skipped)`);
    if (skippedDedup > 0)  console.log(`  Duplicates    : ${skippedDedup} (skipped)`);
    if (failed > 0)        console.log(`  Failed        : ${failed}`);

    if (dupLog.length > 0) {
        console.log("\n  Skipped as likely duplicates:");
        for (const l of dupLog) console.log(`    ${l}`);
    }

    if (!DRY_RUN && downloaded > 0) {
        console.log("\n  Next steps:");
        console.log("  1. Review profiles/recovered/ in File Explorer");
        console.log("     — each Group_NNN folder = one estimated profile session");
        console.log("     — rename folders to the person's name if you know it");
        console.log("     — split or merge folders if images are mis-grouped");
        console.log("  2. Move folders into profiles/girls/ or profiles/boys/");
        console.log("     (gender is required by batchImport — use your judgement");
        console.log("      or let AI figure it out if there's a CV with a name)");
        console.log("  3. npx tsx scripts/batchImport.ts");
        console.log("");
    }
}

main().catch(err => {
    console.error("\nFatal:", err.message);
    process.exit(1);
});
