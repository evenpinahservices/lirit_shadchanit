import mongoose from "mongoose";

/**
 * Validate if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize string input - remove dangerous characters and limit length
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    return sanitized;
}

/**
 * Validate email format (basic)
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate phone number format (basic - allows international format)
 */
export function isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    // Allow international format: +1234567890 or digits only
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.trim().replace(/[\s\-\(\)]/g, ''));
}
