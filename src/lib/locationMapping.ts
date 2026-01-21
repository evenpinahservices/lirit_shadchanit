// Hebrew-English location mapping for matching logic

// Country codes for location grouping
export type CountryCode = "IL" | "US" | "UK" | "FR" | "BE" | "AU" | "CA" | "OTHER";

// Location with country information
export interface LocationInfo {
  english: string;
  country: CountryCode;
}

// Bidirectional mapping of cities and neighborhoods with country
// Format: Hebrew -> { english, country }
export const LOCATION_MAP_WITH_COUNTRY: Record<string, LocationInfo> = {
  // Israel - Major Cities
  "ירושלים": { english: "Jerusalem", country: "IL" },
  "תל אביב": { english: "Tel Aviv", country: "IL" },
  "תל-אביב": { english: "Tel Aviv", country: "IL" },
  "תל אביב יפו": { english: "Tel Aviv", country: "IL" },
  "חיפה": { english: "Haifa", country: "IL" },
  "באר שבע": { english: "Beer Sheva", country: "IL" },
  "באר-שבע": { english: "Beer Sheva", country: "IL" },
  "בארשבע": { english: "Beer Sheva", country: "IL" },
  "אילת": { english: "Eilat", country: "IL" },
  
  // Israel - Central
  "בני ברק": { english: "Bnei Brak", country: "IL" },
  "בני-ברק": { english: "Bnei Brak", country: "IL" },
  "רמת גן": { english: "Ramat Gan", country: "IL" },
  "רמת-גן": { english: "Ramat Gan", country: "IL" },
  "גבעתיים": { english: "Givatayim", country: "IL" },
  "פתח תקווה": { english: "Petach Tikva", country: "IL" },
  "פתח-תקווה": { english: "Petach Tikva", country: "IL" },
  "פתח תקוה": { english: "Petach Tikva", country: "IL" },
  "ראשון לציון": { english: "Rishon LeZion", country: "IL" },
  "ראשון לצ": { english: "Rishon LeZion", country: "IL" },
  "חולון": { english: "Holon", country: "IL" },
  "בת ים": { english: "Bat Yam", country: "IL" },
  "בת-ים": { english: "Bat Yam", country: "IL" },
  "הרצליה": { english: "Herzliya", country: "IL" },
  "רעננה": { english: "Raanana", country: "IL" },
  "רמת השרון": { english: "Ramat HaSharon", country: "IL" },
  "כפר סבא": { english: "Kfar Saba", country: "IL" },
  "כפר-סבא": { english: "Kfar Saba", country: "IL" },
  "הוד השרון": { english: "Hod HaSharon", country: "IL" },
  "נתניה": { english: "Netanya", country: "IL" },
  "לוד": { english: "Lod", country: "IL" },
  "רמלה": { english: "Ramla", country: "IL" },
  "מודיעין": { english: "Modiin", country: "IL" },
  "מודיעין מכבים רעות": { english: "Modiin", country: "IL" },
  "מודיעין-מכבים-רעות": { english: "Modiin", country: "IL" },
  "מודיעין עילית": { english: "Modiin Illit", country: "IL" },
  "מודיעין-עילית": { english: "Modiin Illit", country: "IL" },
  "ביתר עילית": { english: "Beitar Illit", country: "IL" },
  "ביתר-עילית": { english: "Beitar Illit", country: "IL" },
  "אלעד": { english: "Elad", country: "IL" },
  
  // Israel - Jerusalem Area
  "בית שמש": { english: "Beit Shemesh", country: "IL" },
  "בית-שמש": { english: "Beit Shemesh", country: "IL" },
  "מעלה אדומים": { english: "Maale Adumim", country: "IL" },
  "מעלה-אדומים": { english: "Maale Adumim", country: "IL" },
  "גבעת זאב": { english: "Givat Zeev", country: "IL" },
  "גבעת-זאב": { english: "Givat Zeev", country: "IL" },
  "אפרת": { english: "Efrat", country: "IL" },
  "גוש עציון": { english: "Gush Etzion", country: "IL" },
  "גוש-עציון": { english: "Gush Etzion", country: "IL" },
  
  // Israel - North
  "צפת": { english: "Tzfat", country: "IL" },
  "צפד": { english: "Tzfat", country: "IL" },
  "טבריה": { english: "Tiberias", country: "IL" },
  "טבריא": { english: "Tiberias", country: "IL" },
  "נצרת": { english: "Nazareth", country: "IL" },
  "נצרת עילית": { english: "Nazareth Illit", country: "IL" },
  "עפולה": { english: "Afula", country: "IL" },
  "עכו": { english: "Akko", country: "IL" },
  "נהריה": { english: "Nahariya", country: "IL" },
  "כרמיאל": { english: "Karmiel", country: "IL" },
  "קריית שמונה": { english: "Kiryat Shmona", country: "IL" },
  "קרית שמונה": { english: "Kiryat Shmona", country: "IL" },
  
  // Israel - South
  "אשדוד": { english: "Ashdod", country: "IL" },
  "אשקלון": { english: "Ashkelon", country: "IL" },
  "קריית גת": { english: "Kiryat Gat", country: "IL" },
  "קרית גת": { english: "Kiryat Gat", country: "IL" },
  "שדרות": { english: "Sderot", country: "IL" },
  "אופקים": { english: "Ofakim", country: "IL" },
  "נתיבות": { english: "Netivot", country: "IL" },
  "דימונה": { english: "Dimona", country: "IL" },
  "ערד": { english: "Arad", country: "IL" },
  
  // Israel - Haifa Area
  "קריית אתא": { english: "Kiryat Ata", country: "IL" },
  "קרית אתא": { english: "Kiryat Ata", country: "IL" },
  "קריית ביאליק": { english: "Kiryat Bialik", country: "IL" },
  "קרית ביאליק": { english: "Kiryat Bialik", country: "IL" },
  "קריית מוצקין": { english: "Kiryat Motzkin", country: "IL" },
  "קרית מוצקין": { english: "Kiryat Motzkin", country: "IL" },
  "קריית ים": { english: "Kiryat Yam", country: "IL" },
  "קרית ים": { english: "Kiryat Yam", country: "IL" },
  "טירת כרמל": { english: "Tirat Carmel", country: "IL" },
  "נשר": { english: "Nesher", country: "IL" },
  
  // Israel - Sharon Area
  "רחובות": { english: "Rehovot", country: "IL" },
  "נס ציונה": { english: "Nes Ziona", country: "IL" },
  "נס-ציונה": { english: "Nes Ziona", country: "IL" },
  "יבנה": { english: "Yavne", country: "IL" },
  "גדרה": { english: "Gedera", country: "IL" },
  
  // Israel - Jerusalem Neighborhoods
  "מאה שערים": { english: "Meah Shearim", country: "IL" },
  "מאה-שערים": { english: "Meah Shearim", country: "IL" },
  "גאולה": { english: "Geula", country: "IL" },
  "רמות": { english: "Ramot", country: "IL" },
  "הר נוף": { english: "Har Nof", country: "IL" },
  "הר-נוף": { english: "Har Nof", country: "IL" },
  "בית וגן": { english: "Bayit Vegan", country: "IL" },
  "בית-וגן": { english: "Bayit Vegan", country: "IL" },
  "סנהדריה": { english: "Sanhedria", country: "IL" },
  "סנהדריה מורחבת": { english: "Sanhedria Murchevet", country: "IL" },
  "רוממה": { english: "Romema", country: "IL" },
  "קטמון": { english: "Katamon", country: "IL" },
  "קטמונים": { english: "Katamonim", country: "IL" },
  "תלפיות": { english: "Talpiot", country: "IL" },
  "ארנונה": { english: "Arnona", country: "IL" },
  "בקעה": { english: "Baka", country: "IL" },
  "בקא": { english: "Baka", country: "IL" },
  "רמת שלמה": { english: "Ramat Shlomo", country: "IL" },
  "רמת-שלמה": { english: "Ramat Shlomo", country: "IL" },
  "נוה יעקב": { english: "Neve Yaakov", country: "IL" },
  "נוה-יעקב": { english: "Neve Yaakov", country: "IL" },
  "פסגת זאב": { english: "Pisgat Zeev", country: "IL" },
  "פסגת-זאב": { english: "Pisgat Zeev", country: "IL" },
  "גילה": { english: "Gilo", country: "IL" },
  "מלחה": { english: "Malcha", country: "IL" },
  "עיר גנים": { english: "Ir Ganim", country: "IL" },
  "קריית יובל": { english: "Kiryat Yovel", country: "IL" },
  "קרית יובל": { english: "Kiryat Yovel", country: "IL" },
  "קריית משה": { english: "Kiryat Moshe", country: "IL" },
  "קרית משה": { english: "Kiryat Moshe", country: "IL" },
  "רחביה": { english: "Rechavia", country: "IL" },
  "נחלאות": { english: "Nachlaot", country: "IL" },
  "עין כרם": { english: "Ein Kerem", country: "IL" },
  "עין-כרם": { english: "Ein Kerem", country: "IL" },
  
  // Israel - Bnei Brak Neighborhoods
  "פרדס כץ": { english: "Pardes Katz", country: "IL" },
  "פרדס-כץ": { english: "Pardes Katz", country: "IL" },
  "קריית הרצוג": { english: "Kiryat Herzog", country: "IL" },
  "שיכון ה": { english: "Shikun Hey", country: "IL" },
  "שיכון ג": { english: "Shikun Gimel", country: "IL" },
  
  // USA
  "ניו יורק": { english: "New York", country: "US" },
  "ניו-יורק": { english: "New York", country: "US" },
  "ברוקלין": { english: "Brooklyn", country: "US" },
  "מנהטן": { english: "Manhattan", country: "US" },
  "קווינס": { english: "Queens", country: "US" },
  "לייקווד": { english: "Lakewood", country: "US" },
  "מונסי": { english: "Monsey", country: "US" },
  "פלטבוש": { english: "Flatbush", country: "US" },
  "בורו פארק": { english: "Boro Park", country: "US" },
  "בורו-פארק": { english: "Boro Park", country: "US" },
  "וויליאמסבורג": { english: "Williamsburg", country: "US" },
  "קראון הייטס": { english: "Crown Heights", country: "US" },
  "קראון-הייטס": { english: "Crown Heights", country: "US" },
  "לוס אנג׳לס": { english: "Los Angeles", country: "US" },
  "לוס-אנג׳לס": { english: "Los Angeles", country: "US" },
  "מיאמי": { english: "Miami", country: "US" },
  "שיקגו": { english: "Chicago", country: "US" },
  "בלטימור": { english: "Baltimore", country: "US" },
  "דטרויט": { english: "Detroit", country: "US" },
  "קליבלנד": { english: "Cleveland", country: "US" },
  "פילדלפיה": { english: "Philadelphia", country: "US" },
  
  // UK
  "לונדון": { english: "London", country: "UK" },
  "מנצ׳סטר": { english: "Manchester", country: "UK" },
  "גייטסהד": { english: "Gateshead", country: "UK" },
  
  // France
  "פריז": { english: "Paris", country: "FR" },
  "מרסיי": { english: "Marseille", country: "FR" },
  
  // Belgium
  "אנטוורפן": { english: "Antwerp", country: "BE" },
  
  // Australia
  "מלבורן": { english: "Melbourne", country: "AU" },
  "סידני": { english: "Sydney", country: "AU" },
  
  // Canada
  "טורונטו": { english: "Toronto", country: "CA" },
  "מונטריאול": { english: "Montreal", country: "CA" },
};

// Legacy map for backward compatibility (Hebrew -> English only)
export const LOCATION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LOCATION_MAP_WITH_COUNTRY).map(([hebrew, info]) => [hebrew, info.english])
);

// English locations with their countries
export const ENGLISH_LOCATION_COUNTRY: Record<string, CountryCode> = {
  // Israel
  "Jerusalem": "IL", "Tel Aviv": "IL", "Haifa": "IL", "Beer Sheva": "IL", "Eilat": "IL",
  "Bnei Brak": "IL", "Ramat Gan": "IL", "Givatayim": "IL", "Petach Tikva": "IL",
  "Rishon LeZion": "IL", "Holon": "IL", "Bat Yam": "IL", "Herzliya": "IL", "Raanana": "IL",
  "Ramat HaSharon": "IL", "Kfar Saba": "IL", "Hod HaSharon": "IL", "Netanya": "IL",
  "Lod": "IL", "Ramla": "IL", "Modiin": "IL", "Modiin Illit": "IL", "Beitar Illit": "IL",
  "Elad": "IL", "Beit Shemesh": "IL", "Maale Adumim": "IL", "Givat Zeev": "IL",
  "Efrat": "IL", "Gush Etzion": "IL", "Tzfat": "IL", "Tiberias": "IL", "Nazareth": "IL",
  "Nazareth Illit": "IL", "Afula": "IL", "Akko": "IL", "Nahariya": "IL", "Karmiel": "IL",
  "Kiryat Shmona": "IL", "Ashdod": "IL", "Ashkelon": "IL", "Kiryat Gat": "IL",
  "Sderot": "IL", "Ofakim": "IL", "Netivot": "IL", "Dimona": "IL", "Arad": "IL",
  "Kiryat Ata": "IL", "Kiryat Bialik": "IL", "Kiryat Motzkin": "IL", "Kiryat Yam": "IL",
  "Tirat Carmel": "IL", "Nesher": "IL", "Rehovot": "IL", "Nes Ziona": "IL",
  "Yavne": "IL", "Gedera": "IL", "Meah Shearim": "IL", "Geula": "IL", "Ramot": "IL",
  "Har Nof": "IL", "Bayit Vegan": "IL", "Sanhedria": "IL", "Sanhedria Murchevet": "IL",
  "Romema": "IL", "Katamon": "IL", "Katamonim": "IL", "Talpiot": "IL", "Arnona": "IL",
  "Baka": "IL", "Ramat Shlomo": "IL", "Neve Yaakov": "IL", "Pisgat Zeev": "IL",
  "Gilo": "IL", "Malcha": "IL", "Ir Ganim": "IL", "Kiryat Yovel": "IL",
  "Kiryat Moshe": "IL", "Rechavia": "IL", "Nachlaot": "IL", "Ein Kerem": "IL",
  "Pardes Katz": "IL", "Kiryat Herzog": "IL", "Shikun Hey": "IL", "Shikun Gimel": "IL",
  // USA
  "New York": "US", "Brooklyn": "US", "Manhattan": "US", "Queens": "US",
  "Lakewood": "US", "Monsey": "US", "Flatbush": "US", "Boro Park": "US",
  "Williamsburg": "US", "Crown Heights": "US", "Los Angeles": "US", "Miami": "US",
  "Chicago": "US", "Baltimore": "US", "Detroit": "US", "Cleveland": "US", "Philadelphia": "US",
  // UK
  "London": "UK", "Manchester": "UK", "Gateshead": "UK",
  // France
  "Paris": "FR", "Marseille": "FR",
  // Belgium
  "Antwerp": "BE",
  // Australia
  "Melbourne": "AU", "Sydney": "AU",
  // Canada
  "Toronto": "CA", "Montreal": "CA",
};

// Create reverse mapping (English -> Hebrew) for display purposes
export const REVERSE_LOCATION_MAP: Record<string, string> = Object.entries(LOCATION_MAP).reduce(
  (acc, [hebrew, english]) => {
    // Only add if not already present (first Hebrew variant wins)
    if (!acc[english]) {
      acc[english] = hebrew;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Normalize a location string for comparison
 * Removes dashes, extra spaces, and common prefixes/suffixes
 */
function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .trim()
    .replace(/[-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(the|city of|עיר)\s+/i, "")
    .trim();
}

/**
 * Get the canonical (English) version of a location
 * Returns the original if no mapping found
 */
export function getCanonicalLocation(location: string): string {
  if (!location) return location;
  
  // Extract city name from "City, Country" format
  const cityName = location.split(",")[0].trim();
  const normalized = normalizeLocation(location);
  const normalizedCity = normalizeLocation(cityName);
  
  // Try direct lookup (full location)
  if (LOCATION_MAP[location]) return LOCATION_MAP[location];
  if (LOCATION_MAP[normalized]) return LOCATION_MAP[normalized];
  
  // Try direct lookup (city name only)
  if (LOCATION_MAP[cityName]) return LOCATION_MAP[cityName];
  if (LOCATION_MAP[normalizedCity]) return LOCATION_MAP[normalizedCity];
  
  // Try normalized lookup (full location) - check both normalized and original
  for (const [hebrew, english] of Object.entries(LOCATION_MAP)) {
    const hebrewNormalized = normalizeLocation(hebrew);
    if (hebrewNormalized === normalized || hebrewNormalized === normalizedCity || hebrew === location || hebrew === cityName) {
      return english;
    }
  }
  
  // Try normalized lookup (city name only) - already covered above
  
  // Check if already English (full location)
  const englishLower = normalized.toLowerCase();
  for (const english of Object.values(LOCATION_MAP)) {
    if (english.toLowerCase() === englishLower) {
      return english;
    }
  }
  
  // Check if already English (city name only)
  const englishCityLower = normalizedCity.toLowerCase();
  for (const english of Object.values(LOCATION_MAP)) {
    if (english.toLowerCase() === englishCityLower) {
      return english;
    }
  }
  
  // Return city name if no mapping found (for "City, Country" format)
  if (location.includes(",")) {
    return cityName;
  }
  
  // Return original if no mapping found
  return location;
}

/**
 * Get the country code for a location
 * Returns the country or "OTHER" if not found
 */
export function getLocationCountry(location: string): CountryCode {
  if (!location) return "OTHER";
  
  const normalized = normalizeLocation(location);
  
  // Extract city name from "City, Country" format
  const cityName = location.split(",")[0].trim();
  const normalizedCity = normalizeLocation(cityName);
  
  // Try Hebrew lookup first (exact match - full location)
  if (LOCATION_MAP_WITH_COUNTRY[location]) {
    return LOCATION_MAP_WITH_COUNTRY[location].country;
  }
  
  // Try Hebrew lookup with city name only (exact match)
  if (LOCATION_MAP_WITH_COUNTRY[cityName]) {
    return LOCATION_MAP_WITH_COUNTRY[cityName].country;
  }
  
  // Try normalized Hebrew lookup (full location) - check both normalized and exact match
  for (const [hebrew, info] of Object.entries(LOCATION_MAP_WITH_COUNTRY)) {
    const hebrewNormalized = normalizeLocation(hebrew);
    if (hebrewNormalized === normalized || hebrewNormalized === normalizedCity || hebrew === location || hebrew === cityName) {
      return info.country;
    }
  }
  
  // Try English lookup (full location) - get canonical first
  const canonical = getCanonicalLocation(location);
  if (canonical && ENGLISH_LOCATION_COUNTRY[canonical]) {
    return ENGLISH_LOCATION_COUNTRY[canonical];
  }
  
  // Try English lookup (city name only)
  const canonicalCity = getCanonicalLocation(cityName);
  if (canonicalCity && ENGLISH_LOCATION_COUNTRY[canonicalCity]) {
    return ENGLISH_LOCATION_COUNTRY[canonicalCity];
  }
  
  // Try direct English lookup with case insensitivity (full location)
  for (const [english, country] of Object.entries(ENGLISH_LOCATION_COUNTRY)) {
    if (english.toLowerCase() === normalized || english.toLowerCase() === normalizedCity) {
      return country;
    }
  }
  
  // If we got a canonical location from Hebrew, try to get country from that
  if (canonical && canonical !== location && canonical !== cityName) {
    // The canonical might be the English version from LOCATION_MAP
    // Check if any Hebrew maps to this canonical and get its country
    for (const [hebrew, info] of Object.entries(LOCATION_MAP_WITH_COUNTRY)) {
      if (info.english.toLowerCase() === canonical.toLowerCase()) {
        return info.country;
      }
    }
    // Also check ENGLISH_LOCATION_COUNTRY directly
    if (ENGLISH_LOCATION_COUNTRY[canonical]) {
      return ENGLISH_LOCATION_COUNTRY[canonical];
    }
  }
  
  // Final fallback: check if location matches any Hebrew key exactly (case-sensitive for Hebrew)
  for (const [hebrew, info] of Object.entries(LOCATION_MAP_WITH_COUNTRY)) {
    if (hebrew === location || hebrew === cityName) {
      return info.country;
    }
  }
  
  return "OTHER";
}

/**
 * Get the Hebrew version of a location for display
 * Returns the original if no mapping found
 */
export function getHebrewLocation(location: string): string {
  if (!location) return location;
  
  const normalized = normalizeLocation(location);
  
  // Check if already Hebrew
  if (LOCATION_MAP[location] || LOCATION_MAP[normalized]) {
    return location;
  }
  
  // Try reverse lookup
  if (REVERSE_LOCATION_MAP[location]) return REVERSE_LOCATION_MAP[location];
  
  // Try normalized reverse lookup
  for (const [english, hebrew] of Object.entries(REVERSE_LOCATION_MAP)) {
    if (english.toLowerCase() === normalized) {
      return hebrew;
    }
  }
  
  return location;
}

/**
 * Check if two locations are in the same country
 */
export function areLocationsInSameCountry(location1: string, location2: string): boolean {
  const country1 = getLocationCountry(location1);
  const country2 = getLocationCountry(location2);
  
  // If either is unknown, we can't determine - return false for safety
  if (country1 === "OTHER" || country2 === "OTHER") {
    return false;
  }
  
  return country1 === country2;
}

/**
 * Compare two locations for matching purposes
 * Returns true if they refer to the same place (Hebrew or English)
 */
export function compareLocationsEnhanced(location1: string, location2: string): boolean {
  if (!location1 || !location2) return false;
  
  // Normalize both locations
  const norm1 = normalizeLocation(location1);
  const norm2 = normalizeLocation(location2);
  
  // Direct comparison
  if (norm1 === norm2) return true;
  
  // Get canonical versions
  const canonical1 = getCanonicalLocation(location1);
  const canonical2 = getCanonicalLocation(location2);
  
  // Compare canonical versions
  if (canonical1.toLowerCase() === canonical2.toLowerCase()) return true;
  
  // Substring matching (for neighborhood within city)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  if (canonical1.toLowerCase().includes(canonical2.toLowerCase()) || 
      canonical2.toLowerCase().includes(canonical1.toLowerCase())) return true;
  
  return false;
}

/**
 * Advanced location matching that considers country and relocation preferences
 * @param location1 - First location
 * @param location2 - Second location
 * @param willingToRelocate1 - First person's relocation preference ("Yes", "No", "Maybe")
 * @param willingToRelocate2 - Second person's relocation preference ("Yes", "No", "Maybe")
 * @returns true if locations are compatible for matching
 */
export function areLocationsCompatible(
  location1: string,
  location2: string,
  willingToRelocate1?: string,
  willingToRelocate2?: string
): boolean {
  if (!location1 || !location2) return true; // If either location is empty, don't filter by location
  
  // First check: exact same location
  if (compareLocationsEnhanced(location1, location2)) {
    return true;
  }
  
  // Second check: same country = compatible (country-wide matching)
  if (areLocationsInSameCountry(location1, location2)) {
    return true;
  }
  
  // Third check: different countries - only compatible if at least one is willing to relocate
  const relocate1 = willingToRelocate1?.toLowerCase();
  const relocate2 = willingToRelocate2?.toLowerCase();
  
  const isOpenToRelocate1 = relocate1 === "yes" || relocate1 === "maybe";
  const isOpenToRelocate2 = relocate2 === "yes" || relocate2 === "maybe";
  
  // If at least one person is willing to relocate, locations are compatible
  return isOpenToRelocate1 || isOpenToRelocate2;
}

/**
 * Get suggestions for a partial location input
 * Useful for autocomplete functionality
 */
export function getLocationSuggestions(partial: string, limit: number = 10): string[] {
  if (!partial || partial.length < 2) return [];
  
  const normalized = normalizeLocation(partial);
  const suggestions = new Set<string>();
  
  // Search in Hebrew locations
  for (const hebrew of Object.keys(LOCATION_MAP)) {
    if (normalizeLocation(hebrew).includes(normalized) || hebrew.includes(partial)) {
      suggestions.add(hebrew);
    }
    if (suggestions.size >= limit) break;
  }
  
  // Search in English locations
  for (const english of Object.values(LOCATION_MAP)) {
    if (english.toLowerCase().includes(normalized)) {
      suggestions.add(english);
    }
    if (suggestions.size >= limit) break;
  }
  
  return Array.from(suggestions).slice(0, limit);
}

