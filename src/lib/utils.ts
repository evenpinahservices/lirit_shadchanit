import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
 * Handles mixed Hebrew/English text and case-insensitive matching
 */
export function compareLocations(location1: string, location2: string): boolean {
    if (!location1 || !location2) return false;
    
    const norm1 = normalizeForComparison(location1);
    const norm2 = normalizeForComparison(location2);
    
    // Case-insensitive comparison
    return norm1.toLowerCase().includes(norm2.toLowerCase()) || 
           norm2.toLowerCase().includes(norm1.toLowerCase());
}