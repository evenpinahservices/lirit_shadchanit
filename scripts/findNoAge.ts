import mongoose, { Schema } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI!;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const LooseSchema = new Schema({}, { strict: false, timestamps: true });

async function main() {
    await mongoose.connect(uri);
    const conn = mongoose.connection.useDb("lirit", { useCache: true });
    const Client = conn.models["Client"] || conn.model("Client", LooseSchema);

    const clients = await (Client as any).find({}).lean();

    const noAge = clients.filter((c: any) => {
        const dob = c.dob;
        if (!dob) return true;
        const s = String(dob).trim();
        return !s || s === "NaN" || s === "null" || s === "undefined";
    });

    console.log(`Total clients: ${clients.length}`);
    console.log(`No age/dob: ${noAge.length}\n`);
    noAge.forEach((c: any) =>
        console.log(`${c.fullName || "(no name)"} | ${c.gender || "?"} | ${c.location || "?"} | dob: ${JSON.stringify(c.dob)}`)
    );

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
