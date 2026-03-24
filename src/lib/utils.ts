import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { compareLocationsEnhanced, areLocationsCompatible, areLocationsInSameCountry, getLocationCountry } from "./locationMapping";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Re-export location functions for convenience
export { areLocationsCompatible, areLocationsInSameCountry, getLocationCountry };

/**
 * Detects if a string contains Hebrew characters
 */
export function isHebrew(text: string): boolean {
    return /[\u0590-\u05FF]/.test(text);
}

/**
 * Returns the text direction based on content
 */
export function getTextDirection(text: string): "rtl" | "ltr" {
    return isHebrew(text) ? "rtl" : "ltr";
}

/**
 * Normalizes text for comparison, handling Hebrew and mixed Hebrew/English
 * Removes diacritics, normalizes whitespace, and handles case-insensitive comparison
 */
export function normalizeForComparison(text: string): string {
    if (!text) return "";
    // Remove Hebrew diacritics (niqqud) for better matching
    const withoutNiqqud = text.replace(/[\u0591-\u05C7]/g, "");
    // Normalize whitespace
    const normalized = withoutNiqqud.trim().replace(/\s+/g, " ");
    return normalized;
}

/**
 * Hebrew-aware string comparison for location matching
 * Uses the location mapping to match Hebrew and English location names
 */
export function compareLocations(location1: string, location2: string): boolean {
    return compareLocationsEnhanced(location1, location2);
}

/**
 * Detects the likely form language from client data
 * Checks key text fields for Hebrew content
 */
export function detectClientLanguage(client: { 
    fullName?: string; 
    location?: string; 
    personality?: string; 
    hobbies?: string;
    formLanguage?: string;
}): "en" | "he" {
    // If formLanguage is explicitly set, use it
    if (client.formLanguage === "he" || client.formLanguage === "en") {
        return client.formLanguage;
    }
    
    // Check key fields for Hebrew content
    const fieldsToCheck = [
        client.fullName,
        client.location,
        client.personality,
        client.hobbies,
    ].filter(Boolean);
    
    // If any field contains Hebrew, assume Hebrew form
    for (const field of fieldsToCheck) {
        if (field && isHebrew(field)) {
            return "he";
        }
    }
    
    return "en";
}

/**
 * Converts an age in years to the most likely Gregorian birth year.
 * Single source of truth used across AI fill, form sync, and DB flattening.
 * Accepts ±1 year approximation (we don't know if birthday has passed).
 */
export function ageToYear(age: number): number {
    return new Date().getFullYear() - Math.floor(age);
}

/**
 * Converts a Hebrew year number to Hebrew letters (e.g., 5775 -> ה'תשע"ה)
 */
export function convertHebrewYearToLetters(year: number): string {
    // Hebrew year is typically in the 5xxx range (e.g., 5775)
    // We need to convert the last 3 digits (775) to Hebrew letters
    // The thousands digit (5) is represented by ה (heh) with a geresh
    
    const yearStr = year.toString();
    if (yearStr.length !== 4 || !yearStr.startsWith('5')) {
        // If not a standard Hebrew year format, return as string
        return year.toString();
    }
    
    // Extract the last 3 digits (e.g., 775 from 5775)
    const lastThree = parseInt(yearStr.slice(1));
    
    // Maps for Hebrew numerals
    const onesMap: { [key: number]: string } = {
        1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו", 7: "ז", 8: "ח", 9: "ט"
    };
    const tensMap: { [key: number]: string } = {
        10: "י", 20: "כ", 30: "ל", 40: "מ", 50: "נ", 60: "ס", 70: "ע", 80: "פ", 90: "צ"
    };
    const hundredsMap: { [key: string]: number } = {
        "ק": 100, "ר": 200, "ש": 300, "ת": 400
    };
    
    let result = "";
    let remaining = lastThree;
    
    // Handle hundreds - Hebrew uses combinations (e.g., 700 = ת"ש = ת(400) + ש(300))
    if (remaining >= 100) {
        const hundreds = Math.floor(remaining / 100);
        if (hundreds <= 4) {
            // 100-400: use single letter
            const hundredValue = hundreds * 100;
            for (const [letter, value] of Object.entries(hundredsMap)) {
                if (value === hundredValue) {
                    result += letter;
                    remaining -= hundredValue;
                    break;
                }
            }
        } else if (hundreds === 5) {
            // 500 = תק
            result += "תק";
            remaining -= 500;
        } else if (hundreds === 6) {
            // 600 = תר
            result += "תר";
            remaining -= 600;
        } else if (hundreds === 7) {
            // 700 = ת"ש (ת=400 + ש=300)
            result += "תש";
            remaining -= 700;
        } else if (hundreds === 8) {
            // 800 = תת
            result += "תת";
            remaining -= 800;
        } else if (hundreds === 9) {
            // 900 = תתק
            result += "תתק";
            remaining -= 900;
        }
    }
    
    // Handle tens (70, 80, etc.)
    if (remaining >= 10) {
        const tens = Math.floor(remaining / 10) * 10;
        if (tensMap[tens]) {
            result += tensMap[tens];
            remaining -= tens;
        }
    }
    
    // Handle ones
    if (remaining > 0 && onesMap[remaining]) {
        result += onesMap[remaining];
    }
    
    // Add gershayim (״) before the last letter if result has more than one character
    if (result.length > 1) {
        result = result.slice(0, -1) + "״" + result.slice(-1);
    }
    
    // Return just the year part without the ה' prefix
    return result;
}

/**
 * Parses Hebrew year letters to number (e.g., ה'תשע"ה -> 5775)
 */
export function parseHebrewYearToNumber(hebrewYear: string): number {
    const onesMap: { [key: string]: number } = {
        "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9
    };
    const tensMap: { [key: string]: number } = {
        "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40, "נ": 50, "ן": 50, 
        "ס": 60, "ע": 70, "פ": 80, "ף": 80, "צ": 90, "ץ": 90
    };
    const hundredsMap: { [key: string]: number } = {
        "ק": 100, "ר": 200, "ש": 300, "ת": 400
    };
    
    // Remove gershayim, geresh, and other punctuation (but keep the letters)
    const cleaned = hebrewYear.replace(/[״׳"'"]/g, "");
    
    // Check if it starts with ה (heh) for thousands
    let hasThousands = false;
    let yearPart = cleaned;
    if (cleaned.startsWith("ה")) {
        hasThousands = true;
        yearPart = cleaned.slice(1);
    }
    
    // Handle special cases for hundreds (תק, תר, תש, תת, תתק)
    let total = 0;
    let i = 0;
    while (i < yearPart.length) {
        const char = yearPart[i];
        
        // Check for special hundred combinations
        if (char === "ת" && i + 1 < yearPart.length) {
            const nextChar = yearPart[i + 1];
            if (nextChar === "ק") {
                total += 500;
                i += 2;
                continue;
            } else if (nextChar === "ר") {
                total += 600;
                i += 2;
                continue;
            } else if (nextChar === "ש") {
                total += 700;
                i += 2;
                continue;
            } else if (nextChar === "ת") {
                if (i + 2 < yearPart.length && yearPart[i + 2] === "ק") {
                    total += 900;
                    i += 3;
                    continue;
                } else {
                    total += 800;
                    i += 2;
                    continue;
                }
            }
        }
        
        // Regular letter mapping
        if (onesMap[char]) {
            total += onesMap[char];
        } else if (tensMap[char]) {
            total += tensMap[char];
        } else if (hundredsMap[char]) {
            total += hundredsMap[char];
        }
        
        i++;
    }
    
    // Add 5000 for the current millennium (Hebrew years 5xxx)
    if (hasThousands || total < 1000) {
        total += 5000;
    }
    
    return total;
}