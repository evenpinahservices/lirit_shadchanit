/**
 * One-time migration: rename unnamed Hebrew client profiles to "ללא שם".
 * English unnamed profiles are left untouched.
 *
 * Run with: npx tsx scripts/migrateUnnamedHebrew.ts
 */

import mongoose, { Schema } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

function isHebrew(text: string): boolean {
    return /[֐-׿]/.test(text);
}

function isHebrewProfile(client: any): boolean {
    if (client.formLanguage === "he") return true;
    for (const field of ["location", "personality", "hobbies", "familyBackground", "notes", "education", "references"]) {
        if (typeof client[field] === "string" && isHebrew(client[field])) return true;
    }
    return false;
}

async function processDb(dbName: string): Promise<{ scanned: number; renamed: number }> {
    const conn = mongoose.connection.useDb(dbName, { useCache: true });
    const Client = conn.models["Client"] || conn.model("Client", LooseSchema);

    const unnamed = await (Client as any).find({
        $or: [
            { fullName: { $exists: false } },
            { fullName: null },
            { fullName: "" },
            { fullName: /^\s*$/ },
        ],
    }).lean();

    let renamed = 0;
    for (const client of unnamed) {
        if (isHebrewProfile(client)) {
            await (Client as any).updateOne({ _id: client._id }, { $set: { fullName: "ללא שם" } });
            console.log(`  [${dbName}] Renamed _id=${client._id} → ללא שם`);
            renamed++;
        } else {
            console.log(`  [${dbName}] Skipped (English) _id=${client._id}`);
        }
    }

    return { scanned: unnamed.length, renamed };
}

async function main() {
    console.log("Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);

    // List all databases
    const adminDb = mongoose.connection.db!.admin();
    const { databases } = await adminDb.listDatabases();
    const userDbs = databases
        .map((d: any) => d.name as string)
        .filter((n: string) => n === "lirit" || n.startsWith("shadchanit_"));

    console.log(`Found user databases: ${userDbs.join(", ") || "(none)"}\n`);

    let totalScanned = 0;
    let totalRenamed = 0;

    for (const dbName of userDbs) {
        const { scanned, renamed } = await processDb(dbName);
        totalScanned += scanned;
        totalRenamed += renamed;
    }

    console.log(`\n✅  Done`);
    console.log(`   Unnamed profiles scanned: ${totalScanned}`);
    console.log(`   Hebrew profiles renamed:  ${totalRenamed}`);

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
