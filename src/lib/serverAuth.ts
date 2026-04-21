"use server";

import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { AuthUser } from "./auth";

/**
 * Get the currently authenticated user from cookies
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
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
        console.error("Error getting current user:", error);
        return null;
    }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized - Authentication required");
    }
    return user;
}

/**
 * Require admin role - throws error if not admin
 */
export async function requireAdmin(): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role !== "admin") {
        throw new Error("Forbidden - Admin access required");
    }
    return user;
}
