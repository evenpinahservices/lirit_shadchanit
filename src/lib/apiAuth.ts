"use server";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "./auth";
import { checkRateLimit, getClientIP } from "./rateLimit";

/**
 * Middleware to authenticate API requests
 * Returns the authenticated user or null
 */
export async function requireAuth(request: NextRequest): Promise<{ user: any } | { error: NextResponse }> {
    const user = await authenticateRequest(request);
    
    if (!user) {
        return {
            error: NextResponse.json(
                { error: "Unauthorized - Authentication required" },
                { status: 401 }
            )
        };
    }
    
    return { user };
}

/**
 * Middleware to check rate limits for API endpoints
 * @param request - The incoming request
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function requireRateLimit(
    request: NextRequest,
    maxRequests: number,
    windowMs: number
): Promise<{ allowed: true } | { error: NextResponse }> {
    const clientIP = await getClientIP(request);
    const rateLimitKey = `api:${request.nextUrl.pathname}:${clientIP}`;
    
    const result = await checkRateLimit(rateLimitKey, maxRequests, windowMs);
    
    if (!result.allowed) {
        const resetTime = new Date(result.resetAt).toISOString();
        return {
            error: NextResponse.json(
                {
                    error: "Rate limit exceeded",
                    message: `Too many requests. Please try again after ${resetTime}`,
                    resetAt: resetTime,
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": maxRequests.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": result.resetAt.getTime().toString(),
                    },
                }
            )
        };
    }
    
    return { allowed: true };
}

/**
 * Combined middleware: Authentication + Rate Limiting
 */
export async function requireAuthAndRateLimit(
    request: NextRequest,
    maxRequests: number = 100,
    windowMs: number = 3600000 // 1 hour default
): Promise<{ user: any } | { error: NextResponse }> {
    // Check authentication first
    const authResult = await requireAuth(request);
    if ("error" in authResult) {
        return authResult;
    }
    
    // Check rate limit
    const rateLimitResult = await requireRateLimit(request, maxRequests, windowMs);
    if ("error" in rateLimitResult) {
        return rateLimitResult;
    }
    
    return authResult;
}
