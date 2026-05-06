"use server";

import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { User, MOCK_USERS } from "@/lib/mockData";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { signSession } from "@/lib/session";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export async function loginUser(username: string, password?: string): Promise<User | null> {
    console.log("[login] step 1: start");
    try {
        console.log("[login] step 2: connecting to DB...");
        await dbConnect();
        console.log("[login] step 3: DB connected");
    } catch (error) {
        console.error("[login] step 2 FAILED: DB connection error:", error);
        // Continue with mock users if DB connection fails
    }

    if (!password) {
        console.log("[login] no password provided");
        return null;
    }

    // Try to find user in DB
    // Escape special regex characters to prevent regex injection
    const { escapeRegex } = await import("@/lib/validation");
    const escapedUsername = escapeRegex(username);
    let user;
    try {
        console.log("[login] step 4: querying user...");
        user = await UserModel.findOne({
            username: { $regex: new RegExp(`^${escapedUsername}$`, "i") },
        });
        console.log("[login] step 5: query done, user found:", !!user);
    } catch (error) {
        console.error("[login] step 4 FAILED: findOne error:", error);
        // Fall through to mock users
    }

    if (user && user.password) {
        // Check if password is hashed (starts with $2a$ or $2b$ for bcrypt)
        const isHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
        
        let passwordMatches = false;
        if (isHashed) {
            // Verify hashed password
            try {
                console.log("[login] step 6: verifying bcrypt password...");
                passwordMatches = await verifyPassword(password, user.password);
                console.log("[login] step 7: bcrypt done, matches:", passwordMatches);
            } catch (error) {
                console.error("[login] step 6 FAILED: bcrypt error:", error);
                passwordMatches = false;
            }
        } else {
            // Legacy plaintext password - verify and migrate to hash
            passwordMatches = user.password === password;
            if (passwordMatches) {
                try {
                    // Migrate to hashed password
                    const hashedPassword = await hashPassword(password);
                    user.password = hashedPassword;
                    await user.save();
                } catch (error) {
                    console.error("Error migrating password to hash:", error);
                }
            }
        }
        
        if (passwordMatches) {
            const obj = user.toObject();
            const userData = {
                id: obj._id.toString(),
                username: obj.username,
                name: obj.name,
                role: obj.role as "admin" | "user",
                dbName: obj.dbName || undefined,
                // Do not return password
            };
            
            // Set session cookie for API authentication
            try {
                console.log("[login] step 8: setting session cookie...");
                const cookieStore = await cookies();
                cookieStore.set("auth_session", signSession({ userId: userData.id }), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: SESSION_MAX_AGE_SECONDS,
                });
                console.log("[login] step 9: cookie set OK");
            } catch (error) {
                console.error("[login] step 8 FAILED: cookie error:", error);
            }

            console.log("[login] step 10: SUCCESS returning user");
            return userData;
        } else {
            console.log("Password mismatch for user:", username);
        }
    }

    // Fallback to MOCK_USERS if DB is empty ( bootstrapping phase )
    // This helps if the admin user hasn't been created in Mongo yet.
    const mockUser = MOCK_USERS.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (mockUser && mockUser.password === password) {
        // If we matched a mock user, let's auto-migrate them to the DB so next time it's real
        let userId: string | undefined;
        try {
            // Try to connect to DB if not already connected
            try {
                await dbConnect();
            } catch (dbError) {
                console.error("Database connection failed during mock user migration:", dbError);
            }
            
            try {
                const existing = await UserModel.findOne({ username: mockUser.username });
                
                if (!existing) {
                    // Hash the password before storing
                    const hashedPassword = await hashPassword(mockUser.password);
                    const newUser = await UserModel.create({
                        username: mockUser.username,
                        name: mockUser.name,
                        role: mockUser.role,
                        password: hashedPassword
                    });
                    userId = newUser._id.toString();
                } else {
                    userId = existing._id.toString();
                }
            } catch (dbError) {
                console.error("Error finding/creating user in database:", dbError);
                // Continue without userId - we'll use a temporary session
            }
            
            // Set session cookie (use userId if available, otherwise use mock id)
            try {
                const cookieStore = await cookies();
                const sessionUserId = userId || mockUser.id; // Fallback to mock id if DB unavailable
                cookieStore.set("auth_session", signSession({ userId: sessionUserId }), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: SESSION_MAX_AGE_SECONDS,
                });
            } catch (cookieError) {
                console.error("Error setting session cookie:", cookieError);
            }
        } catch (e) {
            console.error("Failed to auto-migrate mock user", e);
            // Still try to set cookie even if migration fails
            try {
                const cookieStore = await cookies();
                cookieStore.set("auth_session", signSession({ userId: mockUser.id }), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: SESSION_MAX_AGE_SECONDS,
                });
            } catch (cookieError) {
                console.error("Error setting fallback session cookie:", cookieError);
            }
        }
        console.log("Login successful with mock user:", mockUser.username);
        return { ...mockUser, password: undefined };
    }

    console.log("Login failed - no matching user found for username:", username);
    return null;
}

/**
 * Verify if the current session is valid
 * Returns the user if authenticated, null otherwise
 */
export async function verifySession(): Promise<User | null> {
    try {
        const { getCurrentUser } = await import("@/lib/serverAuth");
        const authUser = await getCurrentUser();
        
        if (!authUser) {
            return null;
        }
        
        return {
            id: authUser.id,
            username: authUser.username,
            name: authUser.name,
            role: authUser.role,
            impersonating: authUser.impersonating || undefined,
        };
    } catch (error) {
        console.error("Error verifying session:", error);
        return null;
    }
}

/**
 * Clear the server-side session cookie
 */
export async function logoutSession(): Promise<void> {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("auth_session");
    } catch (error) {
        console.error("Error clearing session cookie:", error);
    }
}
