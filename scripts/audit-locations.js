/**
 * Read-only audit: lists all distinct location values from the DB and
 * shows what country each resolves to. No DB writes are performed.
 *
 * Run from web-app/:
 *   node scripts/audit-locations.js
 *
 * Output sections:
 *   ✅ Resolved  — country was identified
 *   ❓ Unknown   — resolves to OTHER (needs cleanup or mapping update)
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("No MONGODB_URI in .env.local");
  process.exit(1);
}

// ── Inline country resolution (mirrors locationMapping.ts logic) ─────────────

// Hebrew → country (mirrors LOCATION_MAP_WITH_COUNTRY)
const HEBREW_LOCATION_COUNTRY = {
  "ירושלים":"IL","תל אביב":"IL","תל-אביב":"IL","תל אביב יפו":"IL","חיפה":"IL",
  "באר שבע":"IL","באר-שבע":"IL","בארשבע":"IL","אילת":"IL",
  "בני ברק":"IL","בני-ברק":"IL","רמת גן":"IL","רמת-גן":"IL","גבעתיים":"IL",
  "פתח תקווה":"IL","פתח-תקווה":"IL","פתח תקוה":"IL","ראשון לציון":"IL","ראשון לצ":"IL",
  "חולון":"IL","בת ים":"IL","בת-ים":"IL","הרצליה":"IL","רעננה":"IL",
  "רמת השרון":"IL","כפר סבא":"IL","כפר-סבא":"IL","הוד השרון":"IL","נתניה":"IL",
  "לוד":"IL","רמלה":"IL","מודיעין":"IL","מודיעין מכבים רעות":"IL","מודיעין-מכבים-רעות":"IL",
  "מודיעין עילית":"IL","מודיעין-עילית":"IL","ביתר עילית":"IL","ביתר-עילית":"IL","אלעד":"IL",
  "בית שמש":"IL","בית-שמש":"IL","מעלה אדומים":"IL","מעלה-אדומים":"IL",
  "גבעת זאב":"IL","גבעת-זאב":"IL","אפרת":"IL","גוש עציון":"IL","גוש-עציון":"IL",
  "צפת":"IL","צפד":"IL","טבריה":"IL","טבריא":"IL","נצרת":"IL","נצרת עילית":"IL",
  "עפולה":"IL","עכו":"IL","נהריה":"IL","כרמיאל":"IL","קריית שמונה":"IL","קרית שמונה":"IL",
  "אשדוד":"IL","אשקלון":"IL","קריית גת":"IL","קרית גת":"IL","שדרות":"IL",
  "אופקים":"IL","נתיבות":"IL","דימונה":"IL","ערד":"IL",
  "קריית אתא":"IL","קרית אתא":"IL","קריית ביאליק":"IL","קרית ביאליק":"IL",
  "קריית מוצקין":"IL","קרית מוצקין":"IL","קריית ים":"IL","קרית ים":"IL",
  "טירת כרמל":"IL","נשר":"IL","רחובות":"IL","נס ציונה":"IL","נס-ציונה":"IL","יבנה":"IL","גדרה":"IL",
  "מאה שערים":"IL","מאה-שערים":"IL","גאולה":"IL","רמות":"IL",
  "הר נוף":"IL","הר-נוף":"IL","בית וגן":"IL","בית-וגן":"IL","סנהדריה":"IL",
  "סנהדריה מורחבת":"IL","רוממה":"IL","קטמון":"IL","קטמונים":"IL","תלפיות":"IL",
  "ארנונה":"IL","בקעה":"IL","בקא":"IL","רמת שלמה":"IL","רמת-שלמה":"IL",
  "נוה יעקב":"IL","נוה-יעקב":"IL","פסגת זאב":"IL","פסגת-זאב":"IL","גילה":"IL","מלחה":"IL",
  "עיר גנים":"IL","קריית יובל":"IL","קרית יובל":"IL","קריית משה":"IL","קרית משה":"IL",
  "רחביה":"IL","נחלאות":"IL","עין כרם":"IL","עין-כרם":"IL",
  "פרדס כץ":"IL","פרדס-כץ":"IL","קריית הרצוג":"IL","שיכון ה":"IL","שיכון ג":"IL",
  "ניו יורק":"US","ניו-יורק":"US","ברוקלין":"US","מנהטן":"US","קווינס":"US",
  "לייקווד":"US","מונסי":"US","פלטבוש":"US","בורו פארק":"US","בורו-פארק":"US",
  "וויליאמסבורג":"US","קראון הייטס":"US","קראון-הייטס":"US",
  "לוס אנג׳לס":"US","לוס-אנג׳לס":"US","מיאמי":"US","שיקגו":"US",
  "בלטימור":"US","דטרויט":"US","קליבלנד":"US","פילדלפיה":"US",
  "לונדון":"UK","מנצ׳סטר":"UK","גייטסהד":"UK",
  "פריז":"FR","מרסיי":"FR","אנטוורפן":"BE","מלבורן":"AU","סידני":"AU",
  "טורונטו":"CA","מונטריאול":"CA",
};

const ENGLISH_LOCATION_COUNTRY = {
  // Israel
  Jerusalem: "IL", "Tel Aviv": "IL", Haifa: "IL", "Beer Sheva": "IL", Eilat: "IL",
  "Bnei Brak": "IL", "Ramat Gan": "IL", Givatayim: "IL", "Petach Tikva": "IL",
  "Rishon LeZion": "IL", Holon: "IL", "Bat Yam": "IL", Herzliya: "IL", Raanana: "IL",
  "Ramat HaSharon": "IL", "Kfar Saba": "IL", "Hod HaSharon": "IL", Netanya: "IL",
  Lod: "IL", Ramla: "IL", Modiin: "IL", "Modiin Illit": "IL", "Beitar Illit": "IL",
  Elad: "IL", "Beit Shemesh": "IL", "Maale Adumim": "IL", "Givat Zeev": "IL",
  Efrat: "IL", "Gush Etzion": "IL", Tzfat: "IL", Tiberias: "IL", Nazareth: "IL",
  "Nazareth Illit": "IL", Afula: "IL", Akko: "IL", Nahariya: "IL", Karmiel: "IL",
  "Kiryat Shmona": "IL", Ashdod: "IL", Ashkelon: "IL", "Kiryat Gat": "IL",
  Sderot: "IL", Ofakim: "IL", Netivot: "IL", Dimona: "IL", Arad: "IL",
  "Kiryat Ata": "IL", "Kiryat Bialik": "IL", "Kiryat Motzkin": "IL", "Kiryat Yam": "IL",
  "Tirat Carmel": "IL", Nesher: "IL", Rehovot: "IL", "Nes Ziona": "IL",
  Yavne: "IL", Gedera: "IL", "Meah Shearim": "IL", Geula: "IL", Ramot: "IL",
  "Har Nof": "IL", "Bayit Vegan": "IL", Sanhedria: "IL", "Sanhedria Murchevet": "IL",
  Romema: "IL", Katamon: "IL", Katamonim: "IL", Talpiot: "IL", Arnona: "IL",
  Baka: "IL", "Ramat Shlomo": "IL", "Neve Yaakov": "IL", "Pisgat Zeev": "IL",
  Gilo: "IL", Malcha: "IL", "Ir Ganim": "IL", "Kiryat Yovel": "IL",
  "Kiryat Moshe": "IL", Rechavia: "IL", Nachlaot: "IL", "Ein Kerem": "IL",
  "Pardes Katz": "IL", "Kiryat Herzog": "IL", "Shikun Hey": "IL", "Shikun Gimel": "IL",
  // USA
  "New York": "US", Brooklyn: "US", Manhattan: "US", Queens: "US",
  Lakewood: "US", Monsey: "US", Flatbush: "US", "Boro Park": "US",
  Williamsburg: "US", "Crown Heights": "US", "Los Angeles": "US", Miami: "US",
  Chicago: "US", Baltimore: "US", Detroit: "US", Cleveland: "US", Philadelphia: "US",
  // UK
  London: "UK", Manchester: "UK", Gateshead: "UK",
  // France
  Paris: "FR", Marseille: "FR",
  // Belgium
  Antwerp: "BE",
  // Australia
  Melbourne: "AU", Sydney: "AU",
  // Canada
  Toronto: "CA", Montreal: "CA",
};

const COUNTRY_NAME_MAP = {
  israel: "IL", "ישראל": "IL",
  "united states": "US", usa: "US", "u.s.a.": "US", america: "US", us: "US",
  "united kingdom": "UK", uk: "UK", england: "UK", britain: "UK", "great britain": "UK",
  france: "FR", belgium: "BE", australia: "AU", canada: "CA",
};

const US_STATES = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

function resolveCountry(location) {
  if (!location || !location.trim()) return "OTHER";
  const loc = location.trim();

  // Direct Hebrew lookup
  if (HEBREW_LOCATION_COUNTRY[loc]) return HEBREW_LOCATION_COUNTRY[loc];

  // Normalized Hebrew lookup (strip dashes, extra spaces)
  const normHe = loc.replace(/[-]/g, " ").replace(/\s+/g, " ").trim();
  if (HEBREW_LOCATION_COUNTRY[normHe]) return HEBREW_LOCATION_COUNTRY[normHe];

  // Hebrew city within a longer address — check each Hebrew key as substring
  for (const [hebrew, country] of Object.entries(HEBREW_LOCATION_COUNTRY)) {
    if (loc.includes(hebrew)) return country;
  }

  // Direct English lookup
  if (ENGLISH_LOCATION_COUNTRY[loc]) return ENGLISH_LOCATION_COUNTRY[loc];

  // Case-insensitive English lookup
  const locLower = loc.toLowerCase();
  for (const [k, v] of Object.entries(ENGLISH_LOCATION_COUNTRY)) {
    if (k.toLowerCase() === locLower) return v;
  }

  // "City, Country" format — resolve country name from last segment
  const parts = loc.split(",");
  if (parts.length >= 2) {
    const countryPart = parts[parts.length - 1].trim().toLowerCase();
    if (COUNTRY_NAME_MAP[countryPart]) return COUNTRY_NAME_MAP[countryPart];
    // Also try the city part
    const cityPart = parts[0].trim();
    if (ENGLISH_LOCATION_COUNTRY[cityPart]) return ENGLISH_LOCATION_COUNTRY[cityPart];
  }

  // US state abbreviation anywhere
  if (US_STATES.test(loc)) return "US";

  // Strip " - suffix" (e.g. "בית מאיר - מושב")
  if (loc.includes(" - ")) {
    const base = loc.split(" - ")[0].trim();
    const result = resolveCountry(base);
    if (result !== "OTHER") return result;
  }

  return "OTHER";
}

const COUNTRY_LABELS = {
  IL: "🇮🇱 Israel", US: "🇺🇸 United States", UK: "🇬🇧 United Kingdom",
  FR: "🇫🇷 France", BE: "🇧🇪 Belgium", AU: "🇦🇺 Australia", CA: "🇨🇦 Canada",
  OTHER: "❓ Unknown",
};

async function run() {
  await mongoose.connect(uri);

  // The app uses named child databases; audit all known ones
  const DB_NAMES = ["lirit", "main"];
  const allLocations = new Set();

  for (const dbName of DB_NAMES) {
    const db = mongoose.connection.useDb(dbName);
    const locs = await db.collection("clients").distinct("location");
    locs.forEach((l) => allLocations.add(l));
  }

  const locations = Array.from(allLocations);
  await mongoose.disconnect();

  const resolved = [];
  const unknown = [];

  for (const loc of locations.sort()) {
    if (!loc || !loc.trim()) continue;
    const country = resolveCountry(loc);
    if (country === "OTHER") {
      unknown.push(loc);
    } else {
      resolved.push({ loc, country });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Location Audit — ${locations.length} distinct values`);
  console.log(`${"=".repeat(60)}\n`);

  console.log(`✅ RESOLVED (${resolved.length}):\n`);
  for (const { loc, country } of resolved) {
    console.log(`  ${COUNTRY_LABELS[country].padEnd(25)} ${loc}`);
  }

  console.log(`\n❓ UNKNOWN / NEEDS CLEANUP (${unknown.length}):\n`);
  for (const loc of unknown) {
    console.log(`  ${loc}`);
  }

  console.log(`\n${"=".repeat(60)}\n`);
  console.log("No DB changes were made. Review unknowns above before any edits.\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
