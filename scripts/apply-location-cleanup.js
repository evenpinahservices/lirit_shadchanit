/**
 * Applies the location standardization to the DB.
 * Run ONLY after reviewing preview-location-cleanup.js output and getting approval.
 *
 * Run: node scripts/apply-location-cleanup.js
 *
 * Design:
 *   - Hebrew raw values → Hebrew "עיר, מדינה" (cosmetic, matches profile language)
 *   - English raw values → English "City, Country"
 *   - Matching works because getCanonicalLocation() translates Hebrew→English at read time
 *   - RBS neighborhoods (א'/ב'/ג'/ד') and Har Nof preserved as distinct
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("No MONGODB_URI"); process.exit(1); }

// ── Section 1: English full addresses → English City, Country ────────────────
const FULL_ADDRESSES_EN = {
  "12 Bentov, Raanana":                                            "Raanana, Israel",
  "3 Hihner St, Petach Tikva":                                     "Petach Tikva, Israel",
  "5364 SW 38ave Hollywood, Florida 33312 USA":                    "Hollywood, United States",
  "69 Muirholme Avenue, Toronto":                                  "Toronto, Canada",
  "Ben Zakai 16/4, Beitar Illit":                                  "Beitar Illit, Israel",
  "Katznelbogen 78, Har Nof, Yerushalayim":                        "Har Nof, Jerusalem, Israel",
  "Nachal Ayalon 21/4 RBS A":                                      "Ramat Beit Shemesh Aleph, Israel",
  "Nachal Dolev 36/42 Ramat Bet Shemesh":                          "Ramat Beit Shemesh, Israel",
  "Nachal ramot 5/14, Beit Shemesh":                               "Ramat Beit Shemesh, Israel",
  "Or Hachaim Street 16, Kiryat Sefer":                            "Modiin Illit, Israel",
  "Originally from Atlanta, Georgia. Currently based in Jerusalem": "Jerusalem, Israel",
  "Rechov Perchina 6, Israel, Torah, Jerusalem":                   "Jerusalem, Israel",
  "Sderot Ben Tzvi 37, Shaarei Chesed":                            "Jerusalem, Israel",
  "Yehuda Hanasi st. Bnei Brak":                                   "Bnei Brak, Israel",
  "Cedarhurst, N.Y. 11516":                                        "Cedarhurst, United States",
};

// ── Section 2: Hebrew full addresses → Hebrew עיר, מדינה ────────────────────
const FULL_ADDRESSES_HE = {
  // מודיעין עילית / קרית ספר
  "אבני נזר 21 מודיעין עילית":                        "מודיעין עילית, ישראל",
  "אור החיים 1 (קרית ספר) מודיעין עילית":             "מודיעין עילית, ישראל",
  "אור החיים 1 מודיעין עלית":                         "מודיעין עילית, ישראל",
  "נְתִיבוֹת הַמִּשְׁפָּט 29 מוֹדִיעִין עִלִּית":     "מודיעין עילית, ישראל",
  "נתיבות המשפט 60, מודיעין עילית":                   "מודיעין עילית, ישראל",
  "נתיבות המשפט 83 מודיעין עילית":                    "מודיעין עילית, ישראל",
  "רשב\"א 7 במודעין עילית":                           "מודיעין עילית, ישראל",
  "בחזון דוד, קריית ספר":                             "מודיעין עילית, ישראל",
  // בני ברק
  "אמרי חיים 21 בני ברק":                             "בני ברק, ישראל",
  "בן זכאי 62 בני ברק":                               "בני ברק, ישראל",
  "ברטנורא ב\"ב":                                     "בני ברק, ישראל",
  "גר בבני ברק":                                      "בני ברק, ישראל",
  "דב חדש 12 בני ברק":                                "בני ברק, ישראל",
  "הרב משה פרדו 12 בני ברק":                          "בני ברק, ישראל",
  "חזון איש 89 בני ברק":                              "בני ברק, ישראל",
  "בבני ברק ברחוב הרב שך.":                           "בני ברק, ישראל",
  "בני ברק רחוב הרב":                                 "בני ברק, ישראל",
  "בני ברק רחוב הרב שלום.":                           "בני ברק, ישראל",
  "בני ברק פרל 11":                                   "בני ברק, ישראל",
  "קהילות יעקב 69 בני ברק":                           "בני ברק, ישראל",
  "ר\"ע 43 ב\"ב":                                     "בני ברק, ישראל",
  "רב אסי 16, בני ברק":                               "בני ברק, ישראל",
  "רחוב ירושלים 65 ב\"ב":                             "בני ברק, ישראל",
  "רחוב רב אמי 8 בני ברק":                            "בני ברק, ישראל",
  "רוזנהיים 4 בני ברק":                               "בני ברק, ישראל",
  "שבטי ישראל 24 בני ברק":                            "בני ברק, ישראל",
  // ירושלים — הר נוף (שכונה ייחודית, נשמרת)
  "ברנד 8 הר נוף ירושלים":                            "הר נוף, ירושלים, ישראל",
  "האדמו\"ר מבאיאן 12 הר נוף ירושלים":               "הר נוף, ירושלים, ישראל",
  "הר נוף ירושלים":                                   "הר נוף, ירושלים, ישראל",
  "הר נוף, ירושלים":                                  "הר נוף, ירושלים, ישראל",
  "הר-נוף, ירושלים":                                  "הר נוף, ירושלים, ישראל",
  "פרנס 4 הר נוף":                                    "הר נוף, ירושלים, ישראל",
  "פרנס 4 הר נוף ירושלים":                            "הר נוף, ירושלים, ישראל",
  "שאלזון 54 הר נוף, ירושלים":                        "הר נוף, ירושלים, ישראל",
  "רח' אהרון בן אהרון 6 הר נוף, ירושלים":            "הר נוף, ירושלים, ישראל",
  "ירושלים, הר נוף":                                  "הר נוף, ירושלים, ישראל",
  "ירושלים, הר נוף. ירושלים":                         "הר נוף, ירושלים, ישראל",
  // ירושלים — שאר כתובות
  "גרוסמן א' בירושלים":                               "ירושלים, ישראל",
  "בבית וגן - ירושלים":                               "ירושלים, ישראל",
  "בירושלים":                                         "ירושלים, ישראל",
  "גבעת שאול ירושלים":                                "ירושלים, ישראל",
  "גבעת שאול, ירושלים":                               "ירושלים, ישראל",
  "כיסופים 17 (רמות) ירושלים":                        "ירושלים, ישראל",
  "כפר עברי 1, נווה יעקב, ירושלים":                  "ירושלים, ישראל",
  "מירושלים":                                         "ירושלים, ישראל",
  "מרוממת שלמה ירושלים":                              "ירושלים, ישראל",
  "נוה יעקב, ירושלים":                                "ירושלים, ישראל",
  "נווה יעקב, ירושלים":                               "ירושלים, ישראל",
  "סנהדריה, ירושלים":                                 "ירושלים, ישראל",
  "קוטלר 13, גבעת-שאול, ירושלים":                    "ירושלים, ישראל",
  "רבי עקיבא 34/4, רמות ד', ירושלים":                "ירושלים, ישראל",
  "רח' הרשלר 5 רמת שלמה ירושלים":                    "ירושלים, ישראל",
  "רח' זיוון 8 (וינגרט 3), נווה יעקב":               "ירושלים, ישראל",
  "רחוב בית וגן 96 ירושלים":                         "ירושלים, ישראל",
  "רחוב האדמו\"ר ממודז'יץ- 17 רמת שלמה, ירושלים":   "ירושלים, ישראל",
  "רחוב הפסגה 59 בית וגן ירושלים":                   "ירושלים, ישראל",
  "רחוב הפסגה 59 בית וגן ירושלים.":                  "ירושלים, ישראל",
  "רחוב קרני 14 גבעת שאול, ירושלים":                 "ירושלים, ישראל",
  "שכונת רמת אשכול, ירושלים":                         "ירושלים, ישראל",
  "ירושלים, ארזי הבירה":                              "ירושלים, ישראל",
  "ירושלים, גאולה":                                   "ירושלים, ישראל",
  "ירושלים, מגדל בניין, בית וגן":                     "ירושלים, ישראל",
  "ירושלים, רמות.":                                   "ירושלים, ישראל",
  "ירושלים, רמת אשכול":                               "ירושלים, ישראל",
  "ירושלים, רמת אשכול(רמת הגולן)":                   "ירושלים, ישראל",
  "ירושלים (רמות)":                                   "ירושלים, ישראל",
  "ירושלים - רחביה":                                  "ירושלים, ישראל",
  "ירושלים והסביבה, ישראל":                           "ירושלים, ישראל",
  "רמות א ירושלים":                                   "ירושלים, ישראל",
  "רמות ג' ירושלים":                                  "ירושלים, ישראל",
  "רמות, ירושלים":                                    "ירושלים, ישראל",
  "רמת א', ירושלים":                                  "ירושלים, ישראל",
  "רמת שלמה ירושלים":                                 "ירושלים, ישראל",
  // רמת בית שמש — שכונות (נשמרות)
  "נחל יהודה 92 רמות בית שמש א.":                    "רמת בית שמש א', ישראל",
  "נחל כהה 14 רמת בית שמש":                          "רמת בית שמש, ישראל",
  "נחל נחשון 11 רמת בית שמש א'":                     "רמת בית שמש א', ישראל",
  "נחל צאלים 3 רמת בית שמש א'.":                     "רמת בית שמש א', ישראל",
  "לכיש 19 רמת בית שמש א'":                          "רמת בית שמש א', ישראל",
  "רח' נחל רביבים 6/19 רמת בית שמש":                "רמת בית שמש, ישראל",
  "רח' נועם אלימלך 16 ב', בני ברק":                  "בני ברק, ישראל",
  "רח בוזוק 10 רמת בית שמש ב'":                      "רמת בית שמש ב', ישראל",
  "רחוב יחזקאל הנביא 11 רמת בית שמש ג'":            "רמת בית שמש ג', ישראל",
  "רמת בית שמש א'":                                  "רמת בית שמש א', ישראל",
  "רמת בית שמש 3":                                   "רמת בית שמש ג', ישראל",
  "רמת בית שמש ג'.":                                 "רמת בית שמש ג', ישראל",
  "רמת בית שמש ד'":                                  "רמת בית שמש ד', ישראל",
  // בית שמש
  "גרימ ברח׳ באר שבע ברמה א׳ בבית שמש":             "בית שמש, ישראל",
  "הושע הנביא 19 בית שמש":                           "בית שמש, ישראל",
  "הנביא צפיה 27 בית שמש":                           "בית שמש, ישראל",
  "חיים הלוי, בית שמש":                              "בית שמש, ישראל",
  "מבית שמש":                                         "בית שמש, ישראל",
  "מודים: שכונת המשקפיים, בית שמש.":                "בית שמש, ישראל",
  "רבנו חיים הלוי, בית שמש":                         "בית שמש, ישראל",
  "רמה א בבית שמש":                                  "בית שמש, ישראל",
  "רמה ד' בית שמש":                                  "בית שמש, ישראל",
  "בית שמש בקריה":                                    "בית שמש, ישראל",
  // ערים אחרות
  "אמרי חיים 4 רחובות":                              "רחובות, ישראל",
  "כפר גנים ג' - פתח תקווה":                          "פתח תקווה, ישראל",
  "פתח תקווה - שכונת גני הדר":                        "פתח תקווה, ישראל",
  "גולדזון 1 רחובות":                                 "רחובות, ישראל",
  "מנשה קפרא 59 רחובות":                              "רחובות, ישראל",
  "רחובות, בשכונת קרעטשניף":                          "רחובות, ישראל",
  "בן זקאי 31 אלעד":                                  "אלעד, ישראל",
  "עובדיה מברטנורא 20 - אלעד":                        "אלעד, ישראל",
  "עובדיה מברטנורא 20 – אלעד":                        "אלעד, ישראל",
  "באלעד":                                             "אלעד, ישראל",
  "בביתר עילית":                                      "ביתר עילית, ישראל",
  "ביתר עילית גבעה B":                                "ביתר עילית, ישראל",
  "ביתר עילית, גבעה ב'":                              "ביתר עילית, ישראל",
  "קדושה לוז 31, ביתר עלית":                          "ביתר עילית, ישראל",
  "ארלוזורוב 34 חיפה":                                "חיפה, ישראל",
  "יואב 31, ג' קרית אליעזר חיפה":                    "חיפה, ישראל",
  "רחוב טבור טבריה":                                  "טבריה, ישראל",
  "הנצחית 30/8 רכסים":                               "רכסים, ישראל",
  "האיילות 51, גבעת זאב":                             "גבעת זאב, ישראל",
  "ישוב גני מודיעין":                                 "מודיעין, ישראל",
  "רמת גן, רמת בית שמש":                              "רמת בית שמש, ישראל",
};

// ── Section 3: Hebrew city names → Hebrew עיר, מדינה ────────────────────────
const CITY_NAMES_HE = {
  "ירושלים":                         "ירושלים, ישראל",
  "גבעת מרדכי":                      "ירושלים, ישראל",
  "גבעת שאול":                       "ירושלים, ישראל",
  "תל אביב":                         "תל אביב, ישראל",
  "גבעתיים":                         "גבעתיים, ישראל",
  "חולון":                           "חולון, ישראל",
  "רמת גן":                          "רמת גן, ישראל",
  "בית שמש":                         "בית שמש, ישראל",
  "בית-שמש":                         "בית שמש, ישראל",
  "רמת בית שמש":                    "רמת בית שמש, ישראל",
  "בני ברק":                         "בני ברק, ישראל",
  "בני ברק חזון איש":                "בני ברק, ישראל",
  "ביתר עילית":                      "ביתר עילית, ישראל",
  "ביתר עלית":                       "ביתר עילית, ישראל",
  "ביתר":                            "ביתר עילית, ישראל",
  "באר עלית, ביתר עלית":             "ביתר עילית, ישראל",
  "מודיעין עילית":                   "מודיעין עילית, ישראל",
  "מודיעין עלית":                    "מודיעין עילית, ישראל",
  "ברכפלד":                          "מודיעין עילית, ישראל",
  "קרית ספר":                        "מודיעין עילית, ישראל",
  "פתח תקווה":                       "פתח תקווה, ישראל",
  "פתח תקוה":                        "פתח תקווה, ישראל",
  "פ\"ת הדר גנים":                   "פתח תקווה, ישראל",
  "פתח- תקווה הדר גנים":             "פתח תקווה, ישראל",
  "במפתח תקווה":                     "פתח תקווה, ישראל",
  "ראשון לציון":                     "ראשון לציון, ישראל",
  "ראשון לציון, מרכז העיר":          "ראשון לציון, ישראל",
  "ראשל\"צ":                         "ראשון לציון, ישראל",
  "רחובות":                          "רחובות, ישראל",
  "אלעד":                            "אלעד, ישראל",
  "אשדוד":                           "אשדוד, ישראל",
  "אשקלון":                          "אשקלון, ישראל",
  "אופקים":                          "אופקים, ישראל",
  "נתיבות":                          "נתיבות, ישראל",
  "נתניה":                           "נתניה, ישראל",
  "חיפה":                            "חיפה, ישראל",
  "נשר":                             "נשר, ישראל",
  "קריית ים":                        "קריית ים, ישראל",
  "קריית מוצקין":                    "קריית מוצקין, ישראל",
  "טבריה":                           "טבריה, ישראל",
  "נהריה":                           "נהריה, ישראל",
  "קריית שמונה":                     "קריית שמונה, ישראל",
  "עפולה":                           "עפולה, ישראל",
  "צפת":                             "צפת, ישראל",
  "קרית אתא":                        "קרית אתא, ישראל",
  "קרית גת":                         "קרית גת, ישראל",
  "קריית מלאכי":                     "קריית מלאכי, ישראל",
  "קרית מלאכי":                      "קריית מלאכי, ישראל",
  "קרית ארבע":                       "קרית ארבע, ישראל",
  "קרית שמואל":                      "קרית שמואל, ישראל",
  "גבעת זאב":                        "גבעת זאב, ישראל",
  "לוד":                             "לוד, ישראל",
  "רמלה":                            "רמלה, ישראל",
  "רעננה":                           "רעננה, ישראל",
  "חדרה":                            "חדרה, ישראל",
  "חצור הגלילית":                    "חצור הגלילית, ישראל",
  "יהוד":                            "יהוד, ישראל",
  "זכרון יעקב":                      "זכרון יעקב, ישראל",
  "פרדס חנה":                        "פרדס חנה, ישראל",
  "מבשרת ציון":                      "מבשרת ציון, ישראל",
  "ממעלות":                          "מעלות, ישראל",
  "גבעת שמואל":                      "גבעת שמואל, ישראל",
  "רכסים":                           "רכסים, ישראל",
  "טלטסטון":                         "קרית יערים, ישראל",
  "טלי סטון":                        "קרית יערים, ישראל",
  "קריית יערים (טלזסטון)":           "קרית יערים, ישראל",
  "קרית יערים":                      "קרית יערים, ישראל",
  "קרית יערים (טלז-סטון)":           "קרית יערים, ישראל",
  "קרית יערים (טלזסטון)":            "קרית יערים, ישראל",
  "ב\"ב":                            "בני ברק, ישראל",
};

// ── Section 4: English spelling variants → English City, Country ─────────────
const SPELLING_VARIANTS_EN = {
  "Yerushalayim":                   "Jerusalem, Israel",
  "Jerusalem/Israel":               "Jerusalem, Israel",
  "Givat Shaul, Jerusalem":         "Jerusalem, Israel",
  "Jewish Quarter, Jerusalem":      "Jerusalem, Israel",
  "Old city Jerusalem.":            "Jerusalem, Israel",
  "Ramat Eshkol Jerusalem":         "Jerusalem, Israel",
  "Ra'anana":                       "Raanana, Israel",
  "Ra'anana ISRAEL":                "Raanana, Israel",
  "Petah Tikva":                    "Petach Tikva, Israel",
  "RBS":                            "Ramat Beit Shemesh, Israel",
  "Ramat Beit Shemesh":             "Ramat Beit Shemesh, Israel",
  "Ramat Beit Shemesh A":           "Ramat Beit Shemesh Aleph, Israel",
  "Ramat Beit Shemesh A'":          "Ramat Beit Shemesh Aleph, Israel",
  "Ramat Beit Shemesh Aleph":       "Ramat Beit Shemesh Aleph, Israel",
  "Ramat Bet Shemesh":              "Ramat Beit Shemesh, Israel",
  "Ramat Bet Shemesh Gimmel":       "Ramat Beit Shemesh Gimmel, Israel",
  "Ramat Bait Shemesh":             "Ramat Beit Shemesh, Israel",
  "Ramot Bet Shemesh Gimmel":       "Ramat Beit Shemesh Gimmel, Israel",
  "Bet Shemesh":                    "Beit Shemesh, Israel",
  "Bet Shemesh Gimel":              "Beit Shemesh, Israel",
  "Modi'in Illit, Brachfeld":       "Modiin Illit, Israel",
  "Modi'in Illit, Jerusalem area":  "Modiin Illit, Israel",
  "Memphis":                        "Memphis, United States",
  "Ottawa, Ontario":                "Ottawa, Canada",
  "Thornhill, ON":                  "Thornhill, Canada",
  // Hebrew-text but foreign city
  "סנט לואיס, מיזורי, ארה\"ב":     "סנט לואיס, ארצות הברית",
};

const ALL_CHANGES = {
  ...FULL_ADDRESSES_EN,
  ...FULL_ADDRESSES_HE,
  ...CITY_NAMES_HE,
  ...SPELLING_VARIANTS_EN,
};

// Maps every Hebrew cosmetic output → English equivalent for locationEnglish field.
// English outputs map to themselves (locationEnglish = location).
const HEBREW_COSMETIC_TO_ENGLISH = {
  "מודיעין עילית, ישראל":          "Modiin Illit, Israel",
  "בני ברק, ישראל":                "Bnei Brak, Israel",
  "הר נוף, ירושלים, ישראל":        "Har Nof, Jerusalem, Israel",
  "ירושלים, ישראל":                "Jerusalem, Israel",
  "רמת בית שמש א', ישראל":         "Ramat Beit Shemesh Aleph, Israel",
  "רמת בית שמש, ישראל":            "Ramat Beit Shemesh, Israel",
  "רמת בית שמש ב', ישראל":         "Ramat Beit Shemesh Bet, Israel",
  "רמת בית שמש ג', ישראל":         "Ramat Beit Shemesh Gimmel, Israel",
  "רמת בית שמש ד', ישראל":         "Ramat Beit Shemesh Dalet, Israel",
  "בית שמש, ישראל":                "Beit Shemesh, Israel",
  "רחובות, ישראל":                 "Rehovot, Israel",
  "פתח תקווה, ישראל":              "Petach Tikva, Israel",
  "אלעד, ישראל":                   "Elad, Israel",
  "ביתר עילית, ישראל":             "Beitar Illit, Israel",
  "חיפה, ישראל":                   "Haifa, Israel",
  "טבריה, ישראל":                  "Tiberias, Israel",
  "רכסים, ישראל":                  "Rekhasim, Israel",
  "גבעת זאב, ישראל":               "Givat Zeev, Israel",
  "מודיעין, ישראל":                "Modiin, Israel",
  "תל אביב, ישראל":                "Tel Aviv, Israel",
  "גבעתיים, ישראל":                "Givatayim, Israel",
  "חולון, ישראל":                  "Holon, Israel",
  "רמת גן, ישראל":                 "Ramat Gan, Israel",
  "ראשון לציון, ישראל":            "Rishon LeZion, Israel",
  "אשדוד, ישראל":                  "Ashdod, Israel",
  "אשקלון, ישראל":                 "Ashkelon, Israel",
  "אופקים, ישראל":                 "Ofakim, Israel",
  "נתיבות, ישראל":                 "Netivot, Israel",
  "נתניה, ישראל":                  "Netanya, Israel",
  "נשר, ישראל":                    "Nesher, Israel",
  "קריית ים, ישראל":               "Kiryat Yam, Israel",
  "קריית מוצקין, ישראל":           "Kiryat Motzkin, Israel",
  "נהריה, ישראל":                  "Nahariya, Israel",
  "קריית שמונה, ישראל":            "Kiryat Shmona, Israel",
  "עפולה, ישראל":                  "Afula, Israel",
  "צפת, ישראל":                    "Tzfat, Israel",
  "קרית אתא, ישראל":               "Kiryat Ata, Israel",
  "קרית גת, ישראל":                "Kiryat Gat, Israel",
  "קריית מלאכי, ישראל":            "Kiryat Malakhi, Israel",
  "קרית ארבע, ישראל":              "Kiryat Arba, Israel",
  "קרית שמואל, ישראל":             "Kiryat Shmuel, Israel",
  "לוד, ישראל":                    "Lod, Israel",
  "רמלה, ישראל":                   "Ramla, Israel",
  "רעננה, ישראל":                  "Raanana, Israel",
  "חדרה, ישראל":                   "Hadera, Israel",
  "חצור הגלילית, ישראל":           "Hazor HaGlilit, Israel",
  "יהוד, ישראל":                   "Yehud, Israel",
  "זכרון יעקב, ישראל":             "Zichron Yaakov, Israel",
  "פרדס חנה, ישראל":               "Pardes Hanna, Israel",
  "מבשרת ציון, ישראל":             "Mevaseret Zion, Israel",
  "מעלות, ישראל":                  "Maalot, Israel",
  "גבעת שמואל, ישראל":             "Givat Shmuel, Israel",
  "קרית יערים, ישראל":             "Kiryat Yearim, Israel",
  "סנט לואיס, ארצות הברית":        "St. Louis, United States",
};

function toEnglish(locationValue) {
  return HEBREW_COSMETIC_TO_ENGLISH[locationValue] || locationValue;
}

const DB_NAMES = ["lirit", "main"];

async function run() {
  await mongoose.connect(uri);

  let totalUpdated = 0;
  const log = [];

  for (const [before, after] of Object.entries(ALL_CHANGES)) {
    let count = 0;
    const locationEnglish = toEnglish(after);
    for (const dbName of DB_NAMES) {
      const col = mongoose.connection.useDb(dbName).collection("clients");
      const result = await col.updateMany(
        { location: before },
        { $set: { location: after, locationEnglish } }
      );
      count += result.modifiedCount;
    }
    if (count > 0) {
      log.push({ before, after, count });
      totalUpdated += count;
    }
  }

  await mongoose.disconnect();

  console.log(`\n${"=".repeat(65)}`);
  console.log(`  Location Cleanup — Applied`);
  console.log(`${"=".repeat(65)}\n`);
  for (const { before, after, count } of log) {
    const n = count === 1 ? "1 profile" : `${count} profiles`;
    console.log(`  ✅ [${n}]  "${before}"  →  "${after}"`);
  }
  console.log(`\n  Total profiles updated: ${totalUpdated}`);
  console.log(`${"=".repeat(65)}\n`);
}

run().catch((e) => { console.error(e); process.exit(1); });
