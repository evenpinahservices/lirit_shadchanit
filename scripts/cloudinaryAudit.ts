/**
 * Audit all Cloudinary assets in shadchanit_clients from a given start date.
 *
 * This is a read-only script — it makes no changes to Cloudinary or the database.
 * It groups images by time proximity to estimate which images belong to the same
 * profile upload session, then exports a manifest for cloudinaryRecover.ts.
 *
 * Usage:
 *   npx tsx scripts/cloudinaryAudit.ts                         # from 2026-02-24 (default)
 *   npx tsx scripts/cloudinaryAudit.ts --from 2026-01-01       # custom start date
 *   npx tsx scripts/cloudinaryAudit.ts --gap 60                # seconds between groups (default 30)
 */

import { v2 as cloudinary } from "cloudinary";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MANIFEST_PATH = path.resolve(__dirname, "cloudinary-manifest.json");

// ── CLI args ──────────────────────────────────────────────────────────────────

const fromArgIdx = process.argv.indexOf("--from");
const FROM_DATE = fromArgIdx !== -1 ? process.argv[fromArgIdx + 1] : "2026-02-24";

const gapArgIdx = process.argv.indexOf("--gap");
const GAP_SECONDS = gapArgIdx !== -1 ? parseInt(process.argv[gapArgIdx + 1], 10) : 30;

// ── Cloudinary fetch with pagination ─────────────────────────────────────────

interface CloudinaryResource {
    public_id: string;
    secure_url: string;
    created_at: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
}

async function fetchAllResources(fromDate: string): Promise<CloudinaryResource[]> {
    const all: CloudinaryResource[] = [];
    let nextCursor: string | undefined;
    let page = 1;

    process.stdout.write("  Fetching from Cloudinary");

    do {
        const searchExpr = cloudinary.search
            .expression(`folder:shadchanit_clients* AND created_at>=${fromDate}`)
            .sort_by("created_at", "asc")
            .max_results(500);

        if (nextCursor) (searchExpr as any).next_cursor(nextCursor);

        const result = await (searchExpr as any).execute();
        all.push(...result.resources);
        nextCursor = result.next_cursor;
        process.stdout.write(".");
        page++;
    } while (nextCursor);

    process.stdout.write(` ${all.length} assets\n`);
    return all;
}

// ── Grouping ─────────────────────────────────────────────────────────────────

interface ProfileGroup {
    groupId: string;
    folder: string;
    firstUploadAt: string;
    lastUploadAt: string;
    imageCount: number;
    assets: { url: string; public_id: string; bytes: number; format: string }[];
}

function extractFolder(public_id: string): string {
    const parts = public_id.split("/");
    return parts.length >= 3
        ? parts.slice(0, -1).join("/")   // shadchanit_clients/username
        : "shadchanit_clients";
}

function clusterByTime(resources: CloudinaryResource[], gapMs: number): CloudinaryResource[][] {
    if (resources.length === 0) return [];
    const sorted = [...resources].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const clusters: CloudinaryResource[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
        if (gap <= gapMs) {
            clusters[clusters.length - 1].push(sorted[i]);
        } else {
            clusters.push([sorted[i]]);
        }
    }
    return clusters;
}

function buildGroups(resources: CloudinaryResource[], gapSeconds: number): ProfileGroup[] {
    // Split into subfolder buckets first, then time-cluster within each bucket
    const byFolder = new Map<string, CloudinaryResource[]>();
    for (const r of resources) {
        const folder = extractFolder(r.public_id);
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push(r);
    }

    const groups: ProfileGroup[] = [];
    let idx = 1;

    for (const [folder, folderResources] of byFolder) {
        const clusters = clusterByTime(folderResources, gapSeconds * 1000);
        for (const cluster of clusters) {
            const sorted = cluster.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            groups.push({
                groupId: `Group_${String(idx).padStart(3, "0")}`,
                folder,
                firstUploadAt: sorted[0].created_at,
                lastUploadAt: sorted[sorted.length - 1].created_at,
                imageCount: sorted.length,
                assets: sorted.map(r => ({
                    url: r.secure_url,
                    public_id: r.public_id,
                    bytes: r.bytes,
                    format: r.format,
                })),
            });
            idx++;
        }
    }

    return groups.sort((a, b) => a.firstUploadAt.localeCompare(b.firstUploadAt));
}

// ── Display ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
    if (b > 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
    if (b > 1_000) return `${Math.round(b / 1_000)} KB`;
    return `${b} B`;
}

function fmtDate(iso: string): string {
    return iso.replace("T", " ").substring(0, 19);
}

function printReport(resources: CloudinaryResource[], groups: ProfileGroup[], fromDate: string): void {
    const totalBytes = resources.reduce((s, r) => s + r.bytes, 0);

    const byFolder = new Map<string, number>();
    for (const r of resources) {
        const f = extractFolder(r.public_id);
        byFolder.set(f, (byFolder.get(f) ?? 0) + 1);
    }

    const imageCounts = groups.map(g => g.imageCount);
    const minImg = Math.min(...imageCounts);
    const maxImg = Math.max(...imageCounts);
    const avgImg = (imageCounts.reduce((a, b) => a + b, 0) / imageCounts.length).toFixed(1);

    const singleImage = groups.filter(g => g.imageCount === 1).length;

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║         Cloudinary Audit — shadchanit_clients                ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
    console.log(`  From date   : ${fromDate}`);
    console.log(`  Total assets: ${resources.length}`);
    console.log(`  Total size  : ${fmtBytes(totalBytes)}`);
    console.log(`  Date range  : ${fmtDate(resources[0]?.created_at ?? "")} → ${fmtDate(resources[resources.length - 1]?.created_at ?? "")}`);

    console.log("\n  Folder breakdown:");
    for (const [folder, count] of [...byFolder.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${folder.padEnd(40)} ${String(count).padStart(4)} assets`);
    }

    console.log(`\n  Estimated profile groups (${gapArgIdx !== -1 ? GAP_SECONDS : 30}s gap): ${groups.length}`);
    console.log(`    Images per group: avg ${avgImg}, range ${minImg}–${maxImg}`);
    if (singleImage > 0) {
        console.log(`    ⚠  ${singleImage} group${singleImage > 1 ? "s" : ""} with only 1 image (likely standalone portraits or orphaned files)`);
    }

    console.log("\n  Largest groups:");
    const top5 = [...groups].sort((a, b) => b.imageCount - a.imageCount).slice(0, 5);
    for (const g of top5) {
        console.log(`    ${g.groupId}  ${fmtDate(g.firstUploadAt)}  ${String(g.imageCount).padStart(2)} images  [${g.folder}]`);
    }

    console.log("\n  Groups by size:");
    const buckets: Record<string, number> = { "1": 0, "2-3": 0, "4-6": 0, "7-10": 0, "11+": 0 };
    for (const g of groups) {
        if      (g.imageCount === 1)  buckets["1"]++;
        else if (g.imageCount <= 3)   buckets["2-3"]++;
        else if (g.imageCount <= 6)   buckets["4-6"]++;
        else if (g.imageCount <= 10)  buckets["7-10"]++;
        else                          buckets["11+"]++;
    }
    for (const [label, count] of Object.entries(buckets)) {
        if (count > 0) console.log(`    ${label.padEnd(6)} images: ${count} group${count !== 1 ? "s" : ""}`);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.error("Cloudinary credentials not set in .env.local");
        process.exit(1);
    }

    console.log(`\nAuditing Cloudinary assets from ${FROM_DATE} with ${GAP_SECONDS}s grouping gap...\n`);

    const resources = await fetchAllResources(FROM_DATE);
    if (resources.length === 0) {
        console.log(`No assets found in shadchanit_clients from ${FROM_DATE}.`);
        return;
    }

    const groups = buildGroups(resources, GAP_SECONDS);
    printReport(resources, groups, FROM_DATE);

    const manifest = {
        generatedAt: new Date().toISOString(),
        fromDate: FROM_DATE,
        gapSeconds: GAP_SECONDS,
        totalAssets: resources.length,
        totalGroups: groups.length,
        groups,
    };

    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
    console.log(`\n  Manifest saved → scripts/cloudinary-manifest.json`);
    console.log("  Next step: npx tsx scripts/cloudinaryRecover.ts\n");
}

main().catch(err => {
    console.error("\nFatal:", err.message);
    process.exit(1);
});
