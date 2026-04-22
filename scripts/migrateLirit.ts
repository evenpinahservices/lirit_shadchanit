/**
 * Sets dbName: "lirit" on the LiritAdam user and migrates all existing
 * clients from the default (test) database into the "lirit" database.
 * Run with: npm run migrate:lirit
 */

import mongoose, { Schema, Connection } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env.local");
    process.exit(1);
}

const UserSchema = new Schema({ username: String, dbName: String }, { strict: false });

const ClientSchema = new Schema({}, { strict: false, timestamps: true });

async function getModel(conn: Connection, name: string, schema: Schema) {
    return conn.models[name] || conn.model(name, schema);
}

async function migrate() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    const mainConn = mongoose.connection;
    const liritConn = mainConn.useDb("lirit", { useCache: true });

    const User = await getModel(mainConn, "User", UserSchema);
    const SourceClient = await getModel(mainConn, "Client", ClientSchema);
    const DestClient = await getModel(liritConn, "Client", ClientSchema);

    // Update LiritAdam's dbName
    const user = await (User as any).findOneAndUpdate(
        { username: { $regex: /^LiritAdam$/i } },
        { dbName: "lirit" },
        { new: true }
    );
    if (!user) {
        console.error("LiritAdam user not found!");
        process.exit(1);
    }
    console.log(`Updated LiritAdam (id: ${user._id}) → dbName: "lirit"`);

    // Copy clients from test → lirit
    const clients = await (SourceClient as any).find({}).lean();
    console.log(`Found ${clients.length} clients in test.clients`);

    if (clients.length > 0) {
        const docs = clients.map(({ _id, ...rest }: any) => rest);
        await (DestClient as any).insertMany(docs);
        console.log(`Copied ${docs.length} clients to lirit.clients`);

        await (SourceClient as any).deleteMany({});
        console.log("Cleared test.clients");
    }

    await mongoose.disconnect();
    console.log("Done! LiritAdam's clients are now isolated in the 'lirit' database.");
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
