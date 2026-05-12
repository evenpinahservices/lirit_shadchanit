/**
 * One-time migration: populate the `locationEnglish` field for all existing
 * client profiles that don't already have it.
 *
 * Strategy:
 *   - If location is already English (no Hebrew chars) → locationEnglish = location
 *   - If location is Hebrew → translate city + country to English using inline maps
 *   - If location is already in "City, Country" format and resolvable → translate
 *   - Unresolvable → locationEnglish = location (best-effort; will still fall back
 *     correctly in areLocationsCompatible which calls translation at read time)
 *
 * Run AFTER apply-location-cleanup.js (those profiles already get locationEnglish set).
 * This script handles everything else.
 *
 * Run: node scripts/populate-location-english.js
 * Dry-run (no writes): node scripts/populate-location-english.js --dry-run
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("No MONGODB_URI in .env.local"); process.exit(1); }

const DRY_RUN = process.argv.includes("--dry-run");

// ── Hebrew → English city translation ────────────────────────────────────────
// Covers all cities that appear (or could appear) in the database.
const HEBREW_CITY_TO_ENGLISH = {
  // Jerusalem + neighborhoods
  "ירושלים": "Jerusalem",
  "הר נוף": "Har Nof",
  "הר-נוף": "Har Nof",
  "גבעת שאול": "Jerusalem",
  "גבעת מרדכי": "Jerusalem",
  "רמות": "Jerusalem",
  "בית וגן": "Jerusalem",
  "נווה יעקב": "Jerusalem",
  "נוה יעקב": "Jerusalem",
  "רמת שלמה": "Jerusalem",
  "סנהדריה": "Jerusalem",
  "גאולה": "Jerusalem",
  "מאה שערים": "Jerusalem",
  "רחביה": "Jerusalem",
  "קטמון": "Jerusalem",
  "בקעה": "Jerusalem",
  "ארנונה": "Jerusalem",
  "גילה": "Jerusalem",
  "מלחה": "Jerusalem",
  "רמת אשכול": "Jerusalem",
  // Tel Aviv area
  "תל אביב": "Tel Aviv",
  "תל-אביב": "Tel Aviv",
  "גבעתיים": "Givatayim",
  "חולון": "Holon",
  "רמת גן": "Ramat Gan",
  "בת ים": "Bat Yam",
  "בת-ים": "Bat Yam",
  // Bnei Brak
  "בני ברק": "Bnei Brak",
  "בני-ברק": "Bnei Brak",
  // Beit Shemesh area
  "בית שמש": "Beit Shemesh",
  "בית-שמש": "Beit Shemesh",
  "רמת בית שמש": "Ramat Beit Shemesh",
  "רמת בית שמש א'": "Ramat Beit Shemesh Aleph",
  "רמת בית שמש ב'": "Ramat Beit Shemesh Bet",
  "רמת בית שמש ג'": "Ramat Beit Shemesh Gimmel",
  "רמת בית שמש ד'": "Ramat Beit Shemesh Dalet",
  // Modiin area
  "מודיעין עילית": "Modiin Illit",
  "מודיעין עלית": "Modiin Illit",
  "קרית ספר": "Modiin Illit",
  "קריית ספר": "Modiin Illit",
  "ברכפלד": "Modiin Illit",
  "מודיעין": "Modiin",
  "מודיעין מכבים רעות": "Modiin",
  // Beitar
  "ביתר עילית": "Beitar Illit",
  "ביתר עלית": "Beitar Illit",
  "ביתר": "Beitar Illit",
  // Elad
  "אלעד": "Elad",
  // Petach Tikva
  "פתח תקווה": "Petach Tikva",
  "פתח תקוה": "Petach Tikva",
  // Rehovot
  "רחובות": "Rehovot",
  // Rishon LeZion
  "ראשון לציון": "Rishon LeZion",
  // Haifa area
  "חיפה": "Haifa",
  "נשר": "Nesher",
  "קריית אתא": "Kiryat Ata",
  "קרית אתא": "Kiryat Ata",
  "קריית ביאליק": "Kiryat Bialik",
  "קריית מוצקין": "Kiryat Motzkin",
  "קרית מוצקין": "Kiryat Motzkin",
  "קריית ים": "Kiryat Yam",
  "קרית ים": "Kiryat Yam",
  "רכסים": "Rekhasim",
  "טירת כרמל": "Tirat Carmel",
  // North
  "נהריה": "Nahariya",
  "עכו": "Akko",
  "קריית שמונה": "Kiryat Shmona",
  "קרית שמונה": "Kiryat Shmona",
  "צפת": "Tzfat",
  "טבריה": "Tiberias",
  "עפולה": "Afula",
  "נצרת": "Nazareth",
  "כרמיאל": "Karmiel",
  // South
  "אשדוד": "Ashdod",
  "אשקלון": "Ashkelon",
  "באר שבע": "Beer Sheva",
  "באר-שבע": "Beer Sheva",
  "אילת": "Eilat",
  "קריית גת": "Kiryat Gat",
  "קרית גת": "Kiryat Gat",
  "קריית מלאכי": "Kiryat Malakhi",
  "קרית מלאכי": "Kiryat Malakhi",
  "שדרות": "Sderot",
  "אופקים": "Ofakim",
  "נתיבות": "Netivot",
  "דימונה": "Dimona",
  "ערד": "Arad",
  // Center
  "נתניה": "Netanya",
  "הרצליה": "Herzliya",
  "רעננה": "Raanana",
  "רמת השרון": "Ramat HaSharon",
  "כפר סבא": "Kfar Saba",
  "כפר-סבא": "Kfar Saba",
  "הוד השרון": "Hod HaSharon",
  "לוד": "Lod",
  "רמלה": "Ramla",
  "פתח תקווה": "Petach Tikva",
  "ראשון לציון": "Rishon LeZion",
  "נס ציונה": "Nes Ziona",
  "נס-ציונה": "Nes Ziona",
  "יבנה": "Yavne",
  "גדרה": "Gedera",
  "גבעת זאב": "Givat Zeev",
  "גבעת-זאב": "Givat Zeev",
  "מעלה אדומים": "Maale Adumim",
  "מעלה-אדומים": "Maale Adumim",
  "אפרת": "Efrat",
  "גוש עציון": "Gush Etzion",
  "מבשרת ציון": "Mevaseret Zion",
  "חדרה": "Hadera",
  "זכרון יעקב": "Zichron Yaakov",
  "פרדס חנה": "Pardes Hanna",
  "יהוד": "Yehud",
  "חצור הגלילית": "Hazor HaGlilit",
  "גבעת שמואל": "Givat Shmuel",
  "מעלות": "Maalot",
  "קרית יערים": "Kiryat Yearim",
  "קריית יערים": "Kiryat Yearim",
  // US
  "ניו יורק": "New York",
  "ברוקלין": "Brooklyn",
  "מנהטן": "Manhattan",
  "קווינס": "Queens",
  "לייקווד": "Lakewood",
  "מונסי": "Monsey",
  "פלטבוש": "Flatbush",
  "בורו פארק": "Boro Park",
  "וויליאמסבורג": "Williamsburg",
  "קראון הייטס": "Crown Heights",
  "לוס אנג'לס": "Los Angeles",
  "לוס אנג׳לס": "Los Angeles",
  "מיאמי": "Miami",
  "שיקגו": "Chicago",
  "בלטימור": "Baltimore",
  "פילדלפיה": "Philadelphia",
  "קליבלנד": "Cleveland",
  "דטרויט": "Detroit",
  // UK
  "לונדון": "London",
  "מנצ'סטר": "Manchester",
  "מנצ׳סטר": "Manchester",
  "גייטסהד": "Gateshead",
  // France / Belgium / Other
  "פריז": "Paris",
  "מרסיי": "Marseille",
  "אנטוורפן": "Antwerp",
  "מלבורן": "Melbourne",
  "סידני": "Sydney",
  "טורונטו": "Toronto",
  "מונטריאול": "Montreal",
};

// Hebrew → English country name
const HEBREW_COUNTRY_TO_ENGLISH = {
  "ישראל": "Israel",
  "ארצות הברית": "United States",
  "ארה\"ב": "United States",
  "ארהב": "United States",
  "בריטניה": "United Kingdom",
  "אנגליה": "United Kingdom",
  "צרפת": "France",
  "בלגיה": "Belgium",
  "אוסטרליה": "Australia",
  "קנדה": "Canada",
};

// City → Country code (for cities with no country in the stored value)
const CITY_COUNTRY = {
  // Israeli cities
  "Jerusalem": "Israel", "Tel Aviv": "Israel", "Haifa": "Israel",
  "Beer Sheva": "Israel", "Eilat": "Israel", "Bnei Brak": "Israel",
  "Ramat Gan": "Israel", "Givatayim": "Israel", "Petach Tikva": "Israel",
  "Rishon LeZion": "Israel", "Holon": "Israel", "Bat Yam": "Israel",
  "Herzliya": "Israel", "Raanana": "Israel", "Ramat HaSharon": "Israel",
  "Kfar Saba": "Israel", "Hod HaSharon": "Israel", "Netanya": "Israel",
  "Lod": "Israel", "Ramla": "Israel", "Modiin": "Israel",
  "Modiin Illit": "Israel", "Beitar Illit": "Israel", "Elad": "Israel",
  "Beit Shemesh": "Israel", "Ramat Beit Shemesh": "Israel",
  "Ramat Beit Shemesh Aleph": "Israel", "Ramat Beit Shemesh Bet": "Israel",
  "Ramat Beit Shemesh Gimmel": "Israel", "Ramat Beit Shemesh Dalet": "Israel",
  "Har Nof": "Israel", "Givat Zeev": "Israel", "Efrat": "Israel",
  "Gush Etzion": "Israel", "Maale Adumim": "Israel",
  "Mevaseret Zion": "Israel", "Tzfat": "Israel", "Tiberias": "Israel",
  "Nazareth": "Israel", "Afula": "Israel", "Akko": "Israel",
  "Nahariya": "Israel", "Karmiel": "Israel", "Kiryat Shmona": "Israel",
  "Ashdod": "Israel", "Ashkelon": "Israel", "Kiryat Gat": "Israel",
  "Sderot": "Israel", "Ofakim": "Israel", "Netivot": "Israel",
  "Dimona": "Israel", "Arad": "Israel", "Nesher": "Israel",
  "Kiryat Ata": "Israel", "Kiryat Bialik": "Israel",
  "Kiryat Motzkin": "Israel", "Kiryat Yam": "Israel",
  "Rekhasim": "Israel", "Tirat Carmel": "Israel",
  "Rehovot": "Israel", "Nes Ziona": "Israel", "Yavne": "Israel",
  "Gedera": "Israel", "Hadera": "Israel", "Zichron Yaakov": "Israel",
  "Pardes Hanna": "Israel", "Yehud": "Israel", "Givat Shmuel": "Israel",
  "Hazor HaGlilit": "Israel", "Maalot": "Israel", "Kiryat Yearim": "Israel",
  "Kiryat Malakhi": "Israel", "Kiryat Arba": "Israel",
  "Kiryat Shmuel": "Israel",
  // USA
  "New York": "United States", "Brooklyn": "United States",
  "Manhattan": "United States", "Queens": "United States",
  "Lakewood": "United States", "Monsey": "United States",
  "Flatbush": "United States", "Boro Park": "United States",
  "Williamsburg": "United States", "Crown Heights": "United States",
  "Los Angeles": "United States", "Miami": "United States",
  "Chicago": "United States", "Baltimore": "United States",
  "Philadelphia": "United States", "Cleveland": "United States",
  "Detroit": "United States",
  // UK
  "London": "United Kingdom", "Manchester": "United Kingdom",
  "Gateshead": "United Kingdom",
  // Other
  "Paris": "France", "Marseille": "France",
  "Antwerp": "Belgium",
  "Melbourne": "Australia", "Sydney": "Australia",
  "Toronto": "Canada", "Montreal": "Canada",
};

// Normalizes "ישראל" → "Israel" etc. for country segments
function translateCountrySegment(seg) {
  return HEBREW_COUNTRY_TO_ENGLISH[seg] || seg;
}

// Returns true if string contains Hebrew characters
function isHebrew(str) {
  return /[֐-׿]/.test(str);
}

// Manual overrides: raw stored value → { location: Hebrew cosmetic, locationEnglish: always English }
// Both fields are written for these entries so messy addresses get cleaned up too.
const MANUAL_OVERRIDES = {
  "מושב קטן צמוד לירושלים":    { location: "ירושלים, ישראל",            locationEnglish: "Jerusalem, Israel" },
  "מרכז":                        { location: "מרכז, ישראל",               locationEnglish: "Merkaz, Israel" },
  "יד בנימין":                   { location: "יד בנימין, ישראל",          locationEnglish: "Yad Binyamin, Israel" },
  "מושב יגל":                    { location: "מושב יגל, ישראל",           locationEnglish: "Moshav Yagel, Israel" },
  "בית חלקיה":                   { location: "בית חלקיה, ישראל",          locationEnglish: "Beit Chilkiyah, Israel" },
  "מושב באיזור אשקלון":          { location: "אשקלון, ישראל",             locationEnglish: "Ashkelon, Israel" },
  "ברכפלד מודיעין עילית":        { location: "מודיעין עילית, ישראל",      locationEnglish: "Modiin Illit, Israel" },
  "בבת ים שמש":                  { location: "בת ים, ישראל",              locationEnglish: "Bat Yam, Israel" },
  "מחלון":                       { location: "חולון, ישראל",              locationEnglish: "Holon, Israel" },
  "אהבת ישראל 60/10 תל ציון":   { location: "תל ציון, ישראל",            locationEnglish: "Tel Zion, Israel" },
  "מושבה מגדל":                  { location: "מגדל, ישראל",               locationEnglish: "Migdal, Israel" },
  "גר במרכז":                    { location: "מרכז, ישראל",               locationEnglish: "Merkaz, Israel" },
  "דרומה, דרום תל אביב 3 בית שמש": { location: "תל אביב, ישראל",        locationEnglish: "Tel Aviv, Israel" },
  "אג עזרי":                     { location: "רמת בית שמש א', ישראל",    locationEnglish: "Ramat Beit Shemesh Aleph, Israel" },
  "נהר הירקון 24 דירה 2":        { location: "בני ברק, ישראל",           locationEnglish: "Bnei Brak, Israel" },
  "רחוב אהרי חיים בבני ברק":    { location: "בני ברק, ישראל",           locationEnglish: "Bnei Brak, Israel" },
  'ירושלים- אשדוד, בורו- בני ברק, בלוקה- פתח תקוה, אורביב- בני ברק, בן חיים- חולון, פרנבומ- אשדוד, אברג\'יל בני ברק, ועקנין קרית ספר': { location: "אלעד, ישראל", locationEnglish: "Elad, Israel" },
  'רש"י 1 אלעד':                 { location: "אלעד, ישראל",              locationEnglish: "Elad, Israel" },
  "במרכז":                       { location: "מרכז, ישראל",               locationEnglish: "Merkaz, Israel" },
  "בית מאיר - מושב":             { location: "בית מאיר, ישראל",           locationEnglish: "Beit Meir, Israel" },
  "בת ימית":                     { location: "בת ים, ישראל",              locationEnglish: "Bat Yam, Israel" },
  "קרית שמואל טבריה":            { location: "טבריה, ישראל",             locationEnglish: "Tiberias, Israel" },
  "בית אל":                      { location: "בית אל, ישראל",             locationEnglish: "Beit El, Israel" },
  "האילות 5/6 בנצח זאב":        { location: "נצח זאב, ישראל",            locationEnglish: "Netzach Zeev, Israel" },
  "גבעת יערים":                  { location: "גבעת יערים, ישראל",         locationEnglish: "Givat Yearim, Israel" },
  "תל ציון":                     { location: "תל ציון, ישראל",            locationEnglish: "Tel Zion, Israel" },
  "מרקאית":                      { location: "מרכז, ישראל",               locationEnglish: "Merkaz, Israel" },
  "פנאמה":                       { location: "פנמה סיטי, פנמה",           locationEnglish: "Panama City, Panama" },
};

/**
 * Given a stored `location` value, returns the English "City, Country" equivalent.
 * Falls back to the original value if translation is not possible.
 */
function toEnglish(location) {
  // Manual overrides: return only the English field (the caller handles location separately)
  if (MANUAL_OVERRIDES[location]) return MANUAL_OVERRIDES[location].locationEnglish;
  if (!location || !location.trim()) return location;
  const loc = location.trim();

  if (!isHebrew(loc)) {
    // Already English — normalize country name aliases
    const parts = loc.split(",").map(s => s.trim());
    if (parts.length >= 2) {
      const country = translateCountrySegment(parts[parts.length - 1]);
      const city = parts.slice(0, -1).join(", ");
      return `${city}, ${country}`;
    }
    return loc;
  }

  // Hebrew — split on comma, translate each segment
  const parts = loc.split(",").map(s => s.trim());

  if (parts.length === 1) {
    // Single Hebrew city/neighborhood
    const city = HEBREW_CITY_TO_ENGLISH[parts[0]];
    if (city) {
      const country = CITY_COUNTRY[city];
      return country ? `${city}, ${country}` : city;
    }
    return loc; // Unknown — return as-is
  }

  if (parts.length === 2) {
    // "עיר, מדינה" or "שכונה, עיר"
    const maybeCountry = HEBREW_COUNTRY_TO_ENGLISH[parts[1]];
    if (maybeCountry) {
      // "city, country" format
      const city = HEBREW_CITY_TO_ENGLISH[parts[0]] || parts[0];
      return `${city}, ${maybeCountry}`;
    }
    // "neighborhood, city" — translate both, look up country from city
    const neighborhood = HEBREW_CITY_TO_ENGLISH[parts[0]] || parts[0];
    const city = HEBREW_CITY_TO_ENGLISH[parts[1]] || parts[1];
    const country = CITY_COUNTRY[city] || CITY_COUNTRY[neighborhood];
    if (country) return `${neighborhood}, ${city}, ${country}`;
    return `${neighborhood}, ${city}`;
  }

  if (parts.length === 3) {
    // "שכונה, עיר, מדינה"
    const country = HEBREW_COUNTRY_TO_ENGLISH[parts[2]] || parts[2];
    const city = HEBREW_CITY_TO_ENGLISH[parts[1]] || parts[1];
    const neighborhood = HEBREW_CITY_TO_ENGLISH[parts[0]] || parts[0];
    return `${neighborhood}, ${city}, ${country}`;
  }

  return loc; // Fallback
}

const DB_NAMES = ["lirit", "main"];

async function run() {
  await mongoose.connect(uri);

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const unknowns = [];

  for (const dbName of DB_NAMES) {
    const col = mongoose.connection.useDb(dbName).collection("clients");
    // Only process profiles that don't already have locationEnglish set
    const cursor = col.find({ locationEnglish: { $exists: false } }, { projection: { _id: 1, location: 1 } });

    for await (const doc of cursor) {
      totalScanned++;
      const raw = doc.location;
      if (!raw || !raw.trim()) {
        totalSkipped++;
        continue;
      }

      const override = MANUAL_OVERRIDES[raw];
      const english = override ? override.locationEnglish : toEnglish(raw);
      const resolved = override || english !== raw || !isHebrew(raw);

      if (!resolved) unknowns.push(raw);

      if (!DRY_RUN) {
        const update = override
          ? { location: override.location, locationEnglish: override.locationEnglish }
          : { locationEnglish: english };
        await col.updateOne({ _id: doc._id }, { $set: update });
      }
      totalUpdated++;
    }
  }

  await mongoose.disconnect();

  console.log(`\n${"=".repeat(65)}`);
  console.log(`  locationEnglish Population${DRY_RUN ? " — DRY RUN (no writes)" : " — Applied"}`);
  console.log(`${"=".repeat(65)}\n`);
  console.log(`  Scanned:  ${totalScanned} profiles without locationEnglish`);
  console.log(`  Updated:  ${totalUpdated} profiles`);
  console.log(`  Skipped:  ${totalSkipped} (no location value)`);

  if (unknowns.length > 0) {
    console.log(`\n  ⚠️  Could not translate (stored as-is, matching falls back to translation fn):`);
    for (const u of [...new Set(unknowns)]) {
      console.log(`    "${u}"`);
    }
  }

  console.log(`\n${"=".repeat(65)}\n`);
}

run().catch((e) => { console.error(e); process.exit(1); });
