
const mongoose = require('mongoose');

// Use the URI from .env.local (or hardcoded backup if needed, but carefully)
// We'll use the one we found in .env.local
const MONGODB_URI = "mongodb+srv://evenpinahservices_lirit_shadchanit:mGGpWlgcomNbRymF@liritshadchanit.c4b1dgl.mongodb.net/test?appName=LiritShadchanit";

async function main() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.");

        // List all databases
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log("Databases:");
        dbs.databases.forEach(db => console.log(` - ${db.name}`));

        // List collections in current DB ('test')
        console.log("\nCollections in 'test':");
        const collections = await mongoose.connection.db.listCollections().toArray();
        collections.forEach(c => console.log(` - ${c.name}`));

        // Check 'liritshadchanit' db if it exists
        const liritDb = dbs.databases.find(db => db.name === 'liritshadchanit');
        if (liritDb) {
            console.log("\nCollections in 'liritshadchanit':");
            const liritConn = mongoose.connection.useDb('liritshadchanit');
            const liritCollections = await liritConn.db.listCollections().toArray();
            liritCollections.forEach(c => console.log(` - ${c.name}`));

            // Count bugs in liritshadchanit if collection exists
            if (liritCollections.find(c => c.name === 'bugreports')) {
                const count = await liritConn.collection('bugreports').countDocuments();
                console.log(`\nFound ${count} bug reports in 'liritshadchanit.bugreports'`);
            }
        }

        // Check 'production' db if it exists
        const prodDb = dbs.databases.find(db => db.name === 'production');
        if (prodDb) {
            console.log("\nCollections in 'production':");
            const prodConn = mongoose.connection.useDb('production');
            const prodCollections = await prodConn.db.listCollections().toArray();
            prodCollections.forEach(c => console.log(` - ${c.name}`));

            if (prodCollections.find(c => c.name === 'bugreports')) {
                const count = await prodConn.collection('bugreports').countDocuments();
                console.log(`\nFound ${count} bug reports in 'production.bugreports'`);
            }
        }


    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
