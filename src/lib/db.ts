import mongoose from "mongoose";
import { DB_CONNECTION_CACHE_SIZE } from "@/lib/constants";

const MONGODB_URI = process.env.MONGODB_URI;

function getMongoUri(): string {
    if (!MONGODB_URI) {
        throw new Error(
            "Please define the MONGODB_URI environment variable inside .env.local"
        );
    }
    return MONGODB_URI;
}

// Minimal LRU cache — evicts the least-recently-used entry when full.
class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const val = this.cache.get(key)!;
        // Re-insert to mark as most-recently-used
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Map iteration order is insertion order — first key is LRU
            const lruKey = this.cache.keys().next().value!;
            this.cache.delete(lruKey);
        }
        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }
}

let mainConnectionPromise: Promise<typeof mongoose> | null = null;
const childConnections = new LRUCache<string, mongoose.Connection>(DB_CONNECTION_CACHE_SIZE);

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

    const cached = childConnections.get(dbName);
    if (cached) return cached;

    const child = mongoose.connection.useDb(dbName, { useCache: true });
    childConnections.set(dbName, child);
    return child;
}

export default dbConnect;
