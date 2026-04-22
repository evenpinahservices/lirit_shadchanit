import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

function getMongoUri(): string {
    if (!MONGODB_URI) {
        throw new Error(
            "Please define the MONGODB_URI environment variable inside .env.local"
        );
    }
    return MONGODB_URI;
}

let mainConnectionPromise: Promise<typeof mongoose> | null = null;
const childConnections: Map<string, mongoose.Connection> = new Map();

async function dbConnect(dbName?: string): Promise<mongoose.Connection> {
    const uri = getMongoUri();

    if (!mainConnectionPromise) {
        const opts = { bufferCommands: false };
        console.log("Connecting to MongoDB...");
        mainConnectionPromise = mongoose.connect(uri, opts).then((m) => {
            console.log("MongoDB Connected Successfully");
            return m;
        }).catch((err) => {
            console.error("MongoDB Connection Error:", err);
            mainConnectionPromise = null;
            throw err;
        });
    }

    await mainConnectionPromise;

    if (!dbName) return mongoose.connection;

    const uriDbMatch = uri.match(/\/([^/?]+)(\?|$)/);
    const defaultDbName = uriDbMatch ? uriDbMatch[1] : "main";

    if (dbName === defaultDbName) return mongoose.connection;

    if (!childConnections.has(dbName)) {
        const child = mongoose.connection.useDb(dbName, { useCache: true });
        childConnections.set(dbName, child);
    }

    return childConnections.get(dbName)!;
}

export default dbConnect;
