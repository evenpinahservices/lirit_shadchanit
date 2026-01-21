const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Allow production URI via environment variable or command line argument
const MONGODB_URI = process.env.MONGODB_URI_PROD || process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI not found!");
    console.error("Usage: node analyze_outdated_labels.js [MONGODB_URI]");
    console.error("Or set MONGODB_URI_PROD environment variable");
    process.exit(1);
}

console.log("Using MongoDB URI:", MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

// Valid values from the schema
const VALID_LEARNING_STATUS = ["Full Time", "Half Time", "Koveah Itim", "Working - Not Learning", "N/A"];
const VALID_HEAD_COVERING = ["N/A", "None", "Wig", "Tichel", "Hat", "Scarf", "Flexible"];

async function analyzeDatabase() {
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

        // Get all clients
        const clients = await clientCollection.find({}).toArray();
        
        // Analysis results
        const issues = {
            invalidLearningStatus: [],
            invalidHeadCovering: [],
            womenWithNAHeadCovering: [],
            menWithNonNAHeadCovering: [],
            learningStatusVariations: {},
            headCoveringVariations: {}
        };

        // Analyze each client
        for (const client of clients) {
            const id = client._id.toString();
            const name = client.fullName || 'Unknown';
            const gender = client.gender;
            const learningStatus = client.learningStatus;
            const headCovering = client.headCovering;

            // Check learning status
            if (learningStatus) {
                if (!VALID_LEARNING_STATUS.includes(learningStatus)) {
                    issues.invalidLearningStatus.push({
                        id,
                        name,
                        gender,
                        currentValue: learningStatus
                    });
                }
                // Track all variations
                if (!issues.learningStatusVariations[learningStatus]) {
                    issues.learningStatusVariations[learningStatus] = [];
                }
                issues.learningStatusVariations[learningStatus].push({ id, name, gender });
            }

            // Check head covering
            if (headCovering) {
                if (!VALID_HEAD_COVERING.includes(headCovering)) {
                    issues.invalidHeadCovering.push({
                        id,
                        name,
                        gender,
                        currentValue: headCovering
                    });
                }
                // Track all variations
                if (!issues.headCoveringVariations[headCovering]) {
                    issues.headCoveringVariations[headCovering] = [];
                }
                issues.headCoveringVariations[headCovering].push({ id, name, gender });

                // Check for women with N/A head covering
                if (gender === 'Female' && headCovering === 'N/A') {
                    issues.womenWithNAHeadCovering.push({
                        id,
                        name,
                        currentValue: headCovering
                    });
                }

                // Check for men with non-N/A head covering (might be okay, but worth noting)
                if (gender === 'Male' && headCovering !== 'N/A' && headCovering) {
                    issues.menWithNonNAHeadCovering.push({
                        id,
                        name,
                        currentValue: headCovering
                    });
                }
            }
        }

        // Print summary
        console.log("=".repeat(80));
        console.log("ANALYSIS SUMMARY");
        console.log("=".repeat(80));
        
        console.log("\n1. INVALID LEARNING STATUS VALUES:");
        console.log("-".repeat(80));
        if (issues.invalidLearningStatus.length === 0) {
            console.log("✓ No invalid learning status values found.");
        } else {
            console.log(`Found ${issues.invalidLearningStatus.length} clients with invalid learning status:`);
            issues.invalidLearningStatus.forEach(issue => {
                console.log(`  - ${issue.name} (${issue.gender}): "${issue.currentValue}"`);
            });
        }

        console.log("\n2. INVALID HEAD COVERING VALUES:");
        console.log("-".repeat(80));
        if (issues.invalidHeadCovering.length === 0) {
            console.log("✓ No invalid head covering values found.");
        } else {
            console.log(`Found ${issues.invalidHeadCovering.length} clients with invalid head covering:`);
            issues.invalidHeadCovering.forEach(issue => {
                console.log(`  - ${issue.name} (${issue.gender}): "${issue.currentValue}"`);
            });
        }

        console.log("\n3. WOMEN WITH 'N/A' HEAD COVERING:");
        console.log("-".repeat(80));
        if (issues.womenWithNAHeadCovering.length === 0) {
            console.log("✓ No women with 'N/A' head covering found.");
        } else {
            console.log(`Found ${issues.womenWithNAHeadCovering.length} women with 'N/A' head covering:`);
            issues.womenWithNAHeadCovering.forEach(issue => {
                console.log(`  - ${issue.name}: "${issue.currentValue}" (should probably be "Flexible" or a specific option)`);
            });
        }

        console.log("\n4. MEN WITH NON-'N/A' HEAD COVERING:");
        console.log("-".repeat(80));
        if (issues.menWithNonNAHeadCovering.length === 0) {
            console.log("✓ No men with non-'N/A' head covering found.");
        } else {
            console.log(`Found ${issues.menWithNonNAHeadCovering.length} men with non-'N/A' head covering:`);
            issues.menWithNonNAHeadCovering.forEach(issue => {
                console.log(`  - ${issue.name}: "${issue.currentValue}" (might need to be changed to "N/A")`);
            });
        }

        console.log("\n5. ALL LEARNING STATUS VALUES IN DATABASE:");
        console.log("-".repeat(80));
        const learningStatusCounts = {};
        Object.keys(issues.learningStatusVariations).forEach(status => {
            learningStatusCounts[status] = issues.learningStatusVariations[status].length;
        });
        Object.entries(learningStatusCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([status, count]) => {
                const isValid = VALID_LEARNING_STATUS.includes(status);
                const marker = isValid ? "✓" : "✗";
                console.log(`  ${marker} "${status}": ${count} client(s)`);
            });

        console.log("\n6. ALL HEAD COVERING VALUES IN DATABASE:");
        console.log("-".repeat(80));
        const headCoveringCounts = {};
        Object.keys(issues.headCoveringVariations).forEach(covering => {
            headCoveringCounts[covering] = issues.headCoveringVariations[covering].length;
        });
        Object.entries(headCoveringCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([covering, count]) => {
                const isValid = VALID_HEAD_COVERING.includes(covering);
                const marker = isValid ? "✓" : "✗";
                const genderBreakdown = {};
                issues.headCoveringVariations[covering].forEach(c => {
                    genderBreakdown[c.gender] = (genderBreakdown[c.gender] || 0) + 1;
                });
                const genderInfo = Object.entries(genderBreakdown)
                    .map(([g, n]) => `${g}:${n}`)
                    .join(', ');
                console.log(`  ${marker} "${covering}": ${count} client(s) [${genderInfo}]`);
            });

        console.log("\n" + "=".repeat(80));
        console.log("DETAILED ISSUES FOR REVIEW:");
        console.log("=".repeat(80));
        
        // Detailed list of issues that need fixing
        const allIssues = [];
        
        issues.invalidLearningStatus.forEach(issue => {
            allIssues.push({
                type: 'Invalid Learning Status',
                id: issue.id,
                name: issue.name,
                gender: issue.gender,
                current: issue.currentValue,
                suggested: 'Needs review - value not in allowed list'
            });
        });

        issues.invalidHeadCovering.forEach(issue => {
            allIssues.push({
                type: 'Invalid Head Covering',
                id: issue.id,
                name: issue.name,
                gender: issue.gender,
                current: issue.currentValue,
                suggested: 'Needs review - value not in allowed list'
            });
        });

        issues.womenWithNAHeadCovering.forEach(issue => {
            allIssues.push({
                type: 'Woman with N/A Head Covering',
                id: issue.id,
                name: issue.name,
                gender: 'Female',
                current: 'N/A',
                suggested: 'Flexible (or specific option)'
            });
        });

        if (allIssues.length === 0) {
            console.log("\n✓ No issues found that need fixing!");
        } else {
            console.log(`\nFound ${allIssues.length} issues that may need fixing:\n`);
            allIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.type}`);
                console.log(`   Name: ${issue.name}`);
                console.log(`   Gender: ${issue.gender}`);
                console.log(`   Current: "${issue.current}"`);
                console.log(`   Suggested: ${issue.suggested}`);
                console.log(`   ID: ${issue.id}`);
                console.log();
            });
        }

        // Save detailed results to a JSON file for reference
        const fs = require('fs');
        const results = {
            timestamp: new Date().toISOString(),
            totalClients: totalCount,
            issues: allIssues,
            learningStatusBreakdown: learningStatusCounts,
            headCoveringBreakdown: headCoveringCounts
        };
        fs.writeFileSync('label_analysis_results.json', JSON.stringify(results, null, 2));
        console.log("Detailed results saved to: label_analysis_results.json");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from database.");
    }
}

analyzeDatabase();
