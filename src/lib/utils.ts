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