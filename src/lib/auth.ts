"use server";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import bcrypt from "bcryptjs";

export interface AuthUser {
    id: string;
    username: string;
    name: string;
    role: "admin" | "user";
    dbName?: string;
    impersonating?: string; // username being impersonated (admin only)
}

/**
 * Check if a user is authenticated from cookies
 * Returns the user if authenticated, null otherwise
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("auth_session");
        
        if (!sessionCookie?.value) {
            return null;
        }

        // Validate cookie value before parsing
        if (typeof sessionCookie.value !== 'string') {
            return null;
        }

        // Parse session data (in production, use JWT or signed cookies)
        let sessionData;
        try {
            sessionData = JSON.parse(sessionCookie.value);
        } catch (error) {
            return null;
        }
        
        // Validate session data structure
        if (!sessionData || typeof sessionData !== 'object' || !sessionData.userId) {
            return null;
        }
        
        // Validate userId is a valid ObjectId
        const { isValidObjectId } = await import("@/lib/validation");
        if (!isValidObjectId(sessionData.userId)) {
            return null;
        }
        
        await dbConnect();
        const user = await UserModel.findById(sessionData.userId).lean();
        
        if (!user) {
            return null;
        }

        return {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            role: user.role as "admin" | "user",
            dbName: (user as any).dbName || undefined,
        };
    } catch (error) {
        console.error("Error getting authenticated user:", error);
        return null;
    }
}

/**
 * Authenticate user from request headers (for API routes)
 * Checks for Authorization header or cookie
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
    // Try cookie-based auth first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");
    
    if (sessionCookie?.value) {
        try {
            // Validate cookie value before parsing
            if (!sessionCookie.value || typeof sessionCookie.value !== 'string') {
                return null;
            }
            
            const sessionData = JSON.parse(sessionCookie.value);
            
            // Validate session data structure
            if (!sessionData || typeof sessionData !== 'object' || !sessionData.userId) {
                return null;
            }
            
            // Validate userId is a valid ObjectId
            const { isValidObjectId } = await import("@/lib/validation");
            if (!isValidObjectId(sessionData.userId)) {
                return null;
            }
            
            await dbConnect();
            const user = await UserModel.findById(sessionData.userId).lean();
            
            if (user) {
                return {
                    id: user._id.toString(),
                    username: user.username,
                    name: user.name,
                    role: user.role as "admin" | "user",
                    dbName: (user as any).dbName || undefined,
                };
            }
        } catch (error) {
            console.error("Error authenticating from cookie:", error);
        }
    }

    // Try Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        // In production, verify JWT token here
        // For now, we'll rely on cookie-based auth
    }

    return null;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
