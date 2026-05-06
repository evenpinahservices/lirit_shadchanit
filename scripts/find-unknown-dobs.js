/**
 * Finds clients with unknown or out-of-range DOBs that need manual correction.
 * A DOB is flagged if:
 *   - Hebrew mode with "?" as the year part (set by DateCarousel when AI returns bad year)
 *   - Hebrew mode with a year outside the valid 18–60 age range
 *   - Age is suspiciously negative or > 80 (OCR misread)
 * Run from web-app: node scripts/find-unknown-dobs.js
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("No MONGODB_URI in .env.local");
  process.exit(1);
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_HEB_YEAR = CURRENT_YEAR + 3760;
const HEB_YEAR_MIN = CURRENT_HEB_YEAR - 60; // max age 60
const HEB_YEAR_MAX = CURRENT_HEB_YEAR - 18; // min age 18

// Stripped-down Hebrew year parser (mirrors parseHebrewYearToNumber in utils.ts)
const HEB_VALS = { א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400 };
function parseHebYear(str) {
  if (!str || str === "?") return NaN;
  const clean = str.replace(/[״׳"'"]/g, "");
  let n = 0;
  for (const ch of clean) {
    if (HEB_VALS[ch] === undefined) return NaN;
    n += HEB_VALS[ch];
  }
  return n > 0 ? n + 5000 : NaN;
}

function checkDob(dob) {
  if (!dob || dob.trim() === "") return { ok: true };

  if (dob.includes("Hebrew:")) {
    const parts = dob.trim().split(" ");
    const yearStr = parts[parts.length - 1];
    if (yearStr === "?") return { ok: false, reason: "Year flagged as unknown by AI extraction" };
    const numeric = parseHebYear(yearStr);
    if (isNaN(numeric)) return { ok: false, reason: `Unparseable Hebrew year: "${yearStr}"` };
    if (numeric < HEB_YEAR_MIN || numeric > HEB_YEAR_MAX) {
      const gregYear = numeric - 3760;
      const age = CURRENT_YEAR - gregYear;
      return { ok: false, reason: `Hebrew year ${numeric} (≈${gregYear}) out of range — age would be ${age}` };
    }
    return { ok: true };
  }

  if (/^\d{4}$/.test(dob.trim())) {
    const yr = parseInt(dob);
    if (yr > CURRENT_YEAR - 18 || yr < CURRENT_YEAR - 80) {
      return { ok: false, reason: `Gregorian birth year ${yr} out of range — age would be ${CURRENT_YEAR - yr}` };
    }
    return { ok: true };
  }

  // Full ISO date
  const d = new Date(dob);
  if (isNaN(d.getTime())) return { ok: false, reason: `Unparseable date: "${dob}"` };
  const age = CURRENT_YEAR - d.getFullYear();
  if (age < 18 || age > 80) return { ok: false, reason: `Age ${age} out of expected range` };
  return { ok: true };
}

async function run() {
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection("clients");
  const clients = await col.find({}, { projection: { name: 1, dob: 1, age: 1 } }).toArray();
  await mongoose.disconnect();

  const flagged = [];
  for (const c of clients) {
    const result = checkDob(c.dob);
    if (!result.ok) {
      flagged.push({
        id: c._id.toString(),
        name: c.name,
        dob: c.dob,
        age: c.age,
        issue: result.reason,
      });
    }
  }

  if (flagged.length === 0) {
    console.log("✅ All client DOBs look valid.");
    return;
  }

  console.log(`⚠  Found ${flagged.length} client(s) with problematic DOBs:\n`);
  for (const f of flagged) {
    console.log(`  Name : ${f.name}`);
    console.log(`  ID   : ${f.id}`);
    console.log(`  DOB  : ${f.dob ?? "(empty)"}`);
    console.log(`  Age  : ${f.age ?? "(empty)"}`);
    console.log(`  Issue: ${f.issue}`);
    console.log();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
