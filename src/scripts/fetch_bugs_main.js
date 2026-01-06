
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://evenpinahservices_lirit_shadchanit:mGGpWlgcomNbRymF@liritshadchanit.c4b1dgl.mongodb.net/test?appName=LiritShadchanit";

async function main() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);

        console.log("Switching to 'main' database...");
        const mainConn = mongoose.connection.useDb('main');

        console.log("Fetching bugs...");
        const bugs = await mainConn.collection('bugreports').find().sort({ createdAt: 1 }).toArray();

        console.log(`Found ${bugs.length} bugs.`);

        let markdown = "# Bug Reports (Main Database)\n\n";
        bugs.forEach((bug, index) => {
            const date = bug.metadata && bug.metadata.timestamp ? new Date(bug.metadata.timestamp).toLocaleString() : 'N/A';
            const user = bug.metadata ? `${bug.metadata.userName} (${bug.metadata.userRole})` : 'Unknown';
            const page = bug.metadata ? bug.metadata.pathname : 'Unknown';

            markdown += `## ${index + 1}. ${bug.description}\n`;
            markdown += `- **ID**: ${bug._id}\n`;
            markdown += `- **Page**: ${page}\n`;
            markdown += `- **User**: ${user}\n`;
            markdown += `- **Date**: ${date}\n`;
            markdown += `- **Status**: ${bug.status || 'new'}\n`;
            if (bug.screenshotUrl) {
                markdown += `- **Screenshot**: ![Screenshot](${bug.screenshotUrl})\n`;
            }
            markdown += `\n---\n\n`;
        });

        const outputPath = path.resolve(process.cwd(), 'bug_report_list.md');
        fs.writeFileSync(outputPath, markdown);
        console.log(`Saved report to ${outputPath}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
