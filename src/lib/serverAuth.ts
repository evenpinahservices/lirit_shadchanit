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
        const realUser = await UserModel.findById(sessionData.userId).lean();

        if (!realUser) {
            return null;
        }

        // Impersonation: if admin has chosen to "view as" another user
        if (sessionData.impersonatingId && (realUser as any).role === "admin") {
            const { isValidObjectId: isValidOid } = await import("@/lib/validation");
            if (isValidOid(sessionData.impersonatingId)) {
                const impersonated = await UserModel.findById(sessionData.impersonatingId).lean();
                if (impersonated) {
                    return {
                        id: realUser._id.toString(),
                        username: (impersonated as any).username,
                        name: (impersonated as any).name,
                        role: (realUser as any).role as "admin" | "user",
                        dbName: (impersonated as any).dbName || undefined,
                        impersonating: (impersonated as any).username,
                    };
                }
            }
        }

        return {
            id: realUser._id.toString(),
            username: (realUser as any).username,
            name: (realUser as any).name,
            role: (realUser as any).role as "admin" | "user",
            dbName: (realUser as any).dbName || undefined,
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
