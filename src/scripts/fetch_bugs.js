
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Verify .env.local exists and load it manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^"(.*)"$/, '$1'); // Remove quotes if present
            process.env[key] = value;
        }
    });
} else {
    console.error(".env.local not found");
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
}

const BugReportSchema = new mongoose.Schema(
    {
        screenshotUrl: { type: String, required: false },
        description: { type: String, required: true },
        metadata: {
            timestamp: { type: Date, required: true },
            pathname: { type: String, required: true },
            userAgent: { type: String, required: true },
            viewport: {
                width: { type: Number, required: true },
                height: { type: Number, required: true },
            },
            screenResolution: {
                width: { type: Number, required: true },
                height: { type: Number, required: true },
            },
            userName: { type: String, required: true },
            userRole: { type: String, required: true },
        },
        status: {
            type: String,
            enum: ["new", "reviewed", "resolved"],
            default: "new",
        },
    },
    { timestamps: true }
);

// Check if model already exists to avoid OverwriteModelError
const BugReport = mongoose.models.BugReport || mongoose.model("BugReport", BugReportSchema);

async function main() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected. Fetching bugs...");

        const bugs = await BugReport.find().sort({ createdAt: 1 }).lean();

        console.log(`Found ${bugs.length} bug reports:`);
        bugs.forEach((bug, index) => {
            console.log(`\n--- Bug ${index + 1} ---`);
            console.log(`ID: ${bug._id}`);
            console.log(`Page: ${bug.metadata.pathname}`);
            console.log(`User: ${bug.metadata.userName} (${bug.metadata.userRole})`);
            console.log(`Description: ${bug.description}`);
            if (bug.screenshotUrl) console.log(`Screenshot: ${bug.screenshotUrl}`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
