/**
 * Syncs the local bug/ directory with MongoDB bug reports:
 * - Deletes subfolders for resolved/archived bugs
 * - Creates subfolders for non-resolved bugs that are missing (screenshot + report.json)
 * Loads .env.local for MONGODB_URI. Run from web-app: node scripts/sync-bug-directory.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");

const BUG_DIR = path.join(process.cwd(), "bug");
const COLLECTION = "bugreports";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection(COLLECTION);
  const reports = await col.find({}).sort({ createdAt: -1 }).toArray();
  await mongoose.disconnect();

  await fs.mkdir(BUG_DIR, { recursive: true });
  const existingDirs = await fs.readdir(BUG_DIR).catch(() => []);

  const reportIds = new Set(reports.map((r) => r._id.toString()));
  const resolvedOrArchived = new Set(
    reports
      .filter((r) => r.status === "resolved" || r.archived)
      .map((r) => r._id.toString())
  );
  const activeIds = new Set(
    reports
      .filter((r) => r.status !== "resolved" && !r.archived)
      .map((r) => r._id.toString())
  );

  // Delete folders for resolved/archived bugs
  for (const name of existingDirs) {
    const dirPath = path.join(BUG_DIR, name);
    const stat = await fs.stat(dirPath).catch(() => null);
    if (!stat?.isDirectory()) continue;
    if (resolvedOrArchived.has(name)) {
      await fs.rm(dirPath, { recursive: true });
      console.log("Removed (resolved/archived):", name);
    }
  }

  // Create folders for active bugs that are missing
  for (const report of reports) {
    const id = report._id.toString();
    if (!activeIds.has(id)) continue;

    const dirPath = path.join(BUG_DIR, id);
    try {
      await fs.access(dirPath);
      // Directory exists, skip
      continue;
    } catch {
      // Directory missing, create and write screenshot + report.json
    }

    await fs.mkdir(dirPath, { recursive: true });

    const reportJson = {
      id,
      description: report.description,
      metadata: {
        ...report.metadata,
        timestamp:
          report.metadata?.timestamp instanceof Date
            ? report.metadata.timestamp.toISOString()
            : report.metadata?.timestamp,
      },
      status: report.status,
      screenshotUrl: report.screenshotUrl || undefined,
      createdAt:
        report.createdAt instanceof Date
          ? report.createdAt.toISOString()
          : report.createdAt,
    };
    await fs.writeFile(
      path.join(dirPath, "report.json"),
      JSON.stringify(reportJson, null, 2),
      "utf-8"
    );

    if (report.screenshotUrl) {
      try {
        const res = await fetch(report.screenshotUrl);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(path.join(dirPath, "screenshot.png"), buf);
        }
      } catch (e) {
        console.warn("Could not download screenshot for", id, e.message);
      }
    }

    console.log("Added:", id);
  }

  console.log("Sync complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
