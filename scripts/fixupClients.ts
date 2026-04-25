/**
 * One-time fixup for existing clients in the lirit database:
 *   1. Title-case fullName (Latin characters only; Hebrew unchanged)
 *   2. Default location → "Israel" when missing
 *   3. Clear invalid dob values ("NaN", null, unparseable strings)
 *
 * Run with: npx tsx scripts/fixupClients.ts
 */

import mongoose, { Schema } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(name: string): string {
    return name.split(/\s+/).map(word => {
        if (!word) return word;
        if (/[֐-׿]/.test(word)) return word;
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
}

function isValidDob(dob: unknown): boolean {
    if (!dob) return false;
    const s = String(dob).trim();
    if (!s || s === "NaN" || s === "null" || s === "undefined") return false;
    const year = s.length <= 4 ? parseInt(s, 10) : new Date(s).getFullYear();
    return !isNaN(year) && year >= 1900 && year < new Date().getFullYear();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("Connecting to MongoDB (lirit db)...");
    await mongoose.connect(MONGODB_URI);
    const liritConn = mongoose.connection.useDb("lirit", { useCache: true });
    const Client = liritConn.models["Client"] || liritConn.model("Client", LooseSchema);

    const clients = await (Client as any).find({}).lean();
    console.log(`Found ${clients.length} clients\n`);

    let nameFixed = 0, locationFixed = 0, dobFixed = 0;

    for (const client of clients) {
        const updates: Record<string, unknown> = {};

        // 1. Title-case name
        if (client.fullName && typeof client.fullName === "string") {
            const fixed = toTitleCase(client.fullName.trim());
            if (fixed !== client.fullName) {
                updates.fullName = fixed;
                nameFixed++;
            }
        }

        // 2. Default location
        if (!client.location || String(client.location).trim() === "") {
            updates.location = "Israel";
            locationFixed++;
        }

        // 3. Clear invalid dob
        if (!isValidDob(client.dob)) {
            updates.dob = undefined; // unset — UI will show N/A rather than NaN
            // Use $unset for MongoDB
            updates.__unsetDob = true;
            dobFixed++;
        }

        if (Object.keys(updates).length > 0) {
            const mongoUpdate: any = { $set: {} };
            const unsetDob = updates.__unsetDob;
            delete updates.__unsetDob;

            if (Object.keys(updates).length > 0) mongoUpdate.$set = updates;
            if (unsetDob) mongoUpdate.$unset = { dob: "" };

            await (Client as any).updateOne({ _id: client._id }, mongoUpdate);
            console.log(`  ${client.fullName?.substring(0, 30) || client._id} →`, Object.keys({
                ...(updates.fullName !== undefined ? { name: updates.fullName } : {}),
                ...(updates.location !== undefined ? { location: updates.location } : {}),
                ...(unsetDob ? { dob: "cleared" } : {}),
            }));
        }
    }

    console.log(`\n✅  Done`);
    console.log(`   Names title-cased:     ${nameFixed}`);
    console.log(`   Location → Israel:     ${locationFixed}`);
    console.log(`   Invalid dob cleared:   ${dobFixed}`);

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
