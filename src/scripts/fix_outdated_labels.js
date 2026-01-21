const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Allow production URI via environment variable or command line argument
const MONGODB_URI = process.env.MONGODB_URI_PROD || process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI not found!");
    console.error("Usage: node fix_outdated_labels.js [MONGODB_URI]");
    console.error("Or set MONGODB_URI_PROD environment variable");
    process.exit(1);
}

console.log("Using MongoDB URI:", MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

async function fixDatabase() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.\n");

        // Check if we should use 'main' database (production)
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        const dbNames = dbs.databases.map(db => db.name);
        console.log("Available databases:", dbNames.join(', '));
        
        let connection = mongoose.connection;
        let dbName = 'default';
        
        // Check if 'main' database exists (production)
        if (dbNames.includes('main')) {
            console.log("\nFound 'main' database (production). Using it...");
            connection = mongoose.connection.useDb('main');
            dbName = 'main';
        } else {
            console.log("\nUsing default database from connection string...");
        }
        
        const db = connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`Collections in '${dbName}':`, collections.map(c => c.name).join(', '));
        
        // Try to find the clients collection
        let clientCollection = null;
        const possibleNames = ['clients', 'Clients', 'client', 'Client'];
        for (const name of possibleNames) {
            if (collections.find(c => c.name === name)) {
                clientCollection = db.collection(name);
                console.log(`\nUsing collection: ${name}`);
                break;
            }
        }

        if (!clientCollection) {
            console.log("\nNo clients collection found. Trying to use 'clients' anyway...");
            clientCollection = db.collection('clients');
        }

        const totalCount = await clientCollection.countDocuments();
        console.log(`\nTotal clients in database: ${totalCount}\n`);

        if (totalCount === 0) {
            console.log("No clients found in database.");
            await mongoose.disconnect();
            return;
        }

        // Fix 1: "Working" → "Working - Not Learning"
        console.log("=".repeat(80));
        console.log("FIX 1: Changing 'Working' to 'Working - Not Learning'");
        console.log("=".repeat(80));
        const workingResult = await clientCollection.updateMany(
            { learningStatus: "Working" },
            { $set: { learningStatus: "Working - Not Learning" } }
        );
        console.log(`Updated ${workingResult.modifiedCount} client(s) from "Working" to "Working - Not Learning"`);

        // Fix 2: "Student" → "N/A"
        console.log("\n" + "=".repeat(80));
        console.log("FIX 2: Changing 'Student' to 'N/A'");
        console.log("=".repeat(80));
        const studentResult = await clientCollection.updateMany(
            { learningStatus: "Student" },
            { $set: { learningStatus: "N/A" } }
        );
        console.log(`Updated ${studentResult.modifiedCount} client(s) from "Student" to "N/A"`);

        // Fix 3: Keep "N/A" as is (no change needed)
        console.log("\n" + "=".repeat(80));
        console.log("FIX 3: Keeping existing 'N/A' values (no changes)");
        console.log("=".repeat(80));
        const naCount = await clientCollection.countDocuments({ learningStatus: "N/A" });
        console.log(`Found ${naCount} client(s) with "N/A" learning status (kept as is)`);

        // Summary
        console.log("\n" + "=".repeat(80));
        console.log("SUMMARY");
        console.log("=".repeat(80));
        console.log(`Total updates: ${workingResult.modifiedCount + studentResult.modifiedCount}`);
        console.log(`  - "Working" → "Working - Not Learning": ${workingResult.modifiedCount}`);
        console.log(`  - "Student" → "N/A": ${studentResult.modifiedCount}`);
        console.log(`  - "N/A" kept as is: ${naCount}`);

        // Verify the fixes
        console.log("\n" + "=".repeat(80));
        console.log("VERIFICATION");
        console.log("=".repeat(80));
        const remainingWorking = await clientCollection.countDocuments({ learningStatus: "Working" });
        const remainingStudent = await clientCollection.countDocuments({ learningStatus: "Student" });
        const totalNA = await clientCollection.countDocuments({ learningStatus: "N/A" });
        const workingNotLearning = await clientCollection.countDocuments({ learningStatus: "Working - Not Learning" });

        console.log("Current learning status values:");
        console.log(`  - "Working - Not Learning": ${workingNotLearning}`);
        console.log(`  - "N/A": ${totalNA}`);
        if (remainingWorking > 0) {
            console.log(`  ⚠️  "Working": ${remainingWorking} (should be 0)`);
        }
        if (remainingStudent > 0) {
            console.log(`  ⚠️  "Student": ${remainingStudent} (should be 0)`);
        }

        if (remainingWorking === 0 && remainingStudent === 0) {
            console.log("\n✓ All fixes applied successfully!");
        } else {
            console.log("\n⚠️  Some values still need attention.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from database.");
    }
}

fixDatabase();
