"use server";

import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { AuthUser } from "./auth";
import { parseSession } from "@/lib/session";

interface UserDoc {
    _id: { toString(): string };
    username: string;
    name: string;
    role: "admin" | "user";
    dbName?: string;
}

function assertUserDoc(doc: unknown): asserts doc is UserDoc {
    if (!doc || typeof doc !== "object") throw new Error("Malformed user document");
    const d = doc as Record<string, unknown>;
    if (!d._id || typeof d.username !== "string" || !d.username) throw new Error("Malformed user document");
    if (!d.name || typeof d.name !== "string") throw new Error("Malformed user document");
}

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

        const sessionData = parseSession(sessionCookie.value);

        if (!sessionData || typeof sessionData !== "object" || !sessionData.userId) {
            return null;
        }

        const { isValidObjectId } = await import("@/lib/validation");
        if (!isValidObjectId(String(sessionData.userId))) {
            return null;
        }

        await dbConnect();
        const realUser = await UserModel.findById(sessionData.userId).lean();

        if (!realUser) {
            return null;
        }

        try {
            assertUserDoc(realUser);
        } catch {
            console.error("[serverAuth] Malformed user document for id:", sessionData.userId);
            return null;
        }

        // Impersonation: admin viewing as another user
        if (sessionData.impersonatingId && realUser.role === "admin") {
            if (isValidObjectId(String(sessionData.impersonatingId))) {
                const impersonated = await UserModel.findById(sessionData.impersonatingId).lean();
                if (impersonated) {
                    try {
                        assertUserDoc(impersonated);
                    } catch {
                        console.error("[serverAuth] Malformed impersonated user document");
                        // Fall through to return real user
                    }
                    if (impersonated) {
                        return {
                            id: realUser._id.toString(),
                            username: (impersonated as UserDoc).username,
                            name: (impersonated as UserDoc).name,
                            role: realUser.role as "admin" | "user",
                            dbName: (impersonated as UserDoc).dbName || undefined,
                            impersonating: (impersonated as UserDoc).username,
                        };
                    }
                }
            }
        }

        return {
            id: realUser._id.toString(),
            username: realUser.username,
            name: realUser.name,
            role: realUser.role as "admin" | "user",
            dbName: realUser.dbName || undefined,
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
