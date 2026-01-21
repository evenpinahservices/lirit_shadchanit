
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Use the URI from environment variables - NEVER hardcode credentials!
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI not found in environment variables!");
    console.error("Please set MONGODB_URI in .env.local file");
    process.exit(1);
}

async function main() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.");

        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        const mainDbInfo = dbs.databases.find(db => db.name === 'main');
        if (mainDbInfo) {
            console.log("Checking 'main' database...");
            const mainConn = mongoose.connection.useDb('main');
            const collections = await mainConn.db.listCollections().toArray();
            console.log("Collections in 'main':", collections.map(c => c.name).join(', '));

            if (collections.find(c => c.name === 'bugreports')) {
                const count = await mainConn.collection('bugreports').countDocuments();
                console.log(`\nFound ${count} bug reports in 'main.bugreports'`);

                if (count > 0) {
                    const bugs = await mainConn.collection('bugreports').find().limit(5).toArray();
                    console.log("First 5 bugs in main:", bugs.map(b => ({ id: b._id, desc: b.description })));
                }
            } else {
                console.log("'bugreports' collection NOT found in 'main'");
            }
        } else {
            console.log("'main' database not found? (It was listed before)");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
