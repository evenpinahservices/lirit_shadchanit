"use server";

import dbConnect from "@/lib/db";
import mongoose from "mongoose";

// Rate limit storage schema
interface RateLimitEntry {
    key: string;
    count: number;
    resetAt: Date;
    createdAt: Date;
}

const RateLimitSchema = new mongoose.Schema<RateLimitEntry>({
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
}, {
    // Auto-delete expired entries after 24 hours
    expireAfterSeconds: 86400,
});

// TTL index for auto-cleanup
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitModel = mongoose.models.RateLimit || mongoose.model<RateLimitEntry>("RateLimit", RateLimitSchema);

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

/**
 * Check rate limit for a given key
 * @param key - Unique identifier (e.g., IP address, token, user ID)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): Promise<RateLimitResult> {
    await dbConnect();
    
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);
    
    try {
        // Find or create rate limit entry
        let entry = await RateLimitModel.findOne({ key });
        
        if (!entry) {
            // Create new entry
            entry = await RateLimitModel.create({
                key,
                count: 1,
                resetAt,
            });
            
            return {
                allowed: true,
                remaining: maxRequests - 1,
                resetAt,
            };
        }
        
        // Check if window has expired
        if (now >= entry.resetAt) {
            // Reset counter
            entry.count = 1;
            entry.resetAt = resetAt;
            await entry.save();
            
            return {
                allowed: true,
                remaining: maxRequests - 1,
                resetAt,
            };
        }
        
        // Check if limit exceeded
        if (entry.count >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: entry.resetAt,
            };
        }
        
        // Increment counter
        entry.count += 1;
        await entry.save();
        
        return {
            allowed: true,
            remaining: maxRequests - entry.count,
            resetAt: entry.resetAt,
        };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // On error, allow the request (fail open)
        return {
            allowed: true,
            remaining: maxRequests,
            resetAt,
        };
    }
}

/**
 * Get client IP address from request
 */
export async function getClientIP(request: Request): Promise<string> {
    // Try various headers (for proxies/load balancers)
    const forwarded = (request as any).headers?.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    
    const realIP = (request as any).headers?.get("x-real-ip");
    if (realIP) {
        return realIP;
    }
    
    // Fallback
    return "unknown";
}
