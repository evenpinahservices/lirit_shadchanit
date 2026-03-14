/**
 * One-off: list bug reports from MongoDB. Loads .env.local for MONGODB_URI.
 * Run from web-app: node scripts/list-bug-reports.js
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("No MONGODB_URI in .env.local");
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection("bugreports");
  const reports = await col.find({}).sort({ createdAt: -1 }).limit(50).toArray();
  console.log(JSON.stringify(reports, null, 2));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
