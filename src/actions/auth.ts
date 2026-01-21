"use server";

import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { User, MOCK_USERS } from "@/lib/mockData";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { cookies } from "next/headers";

export async function loginUser(username: string, password?: string): Promise<User | null> {
    await dbConnect();

    if (!password) {
        return null;
    }

    // Try to find user in DB
    // Escape special regex characters to prevent regex injection
    const { escapeRegex } = await import("@/lib/validation");
    const escapedUsername = escapeRegex(username);
    const user = await UserModel.findOne({
        username: { $regex: new RegExp(`^${escapedUsername}$`, "i") },
    });

    if (user) {
        // Check if password is hashed (starts with $2a$ or $2b$ for bcrypt)
        const isHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
        
        let passwordMatches = false;
        if (isHashed) {
            // Verify hashed password
            passwordMatches = await verifyPassword(password, user.password);
        } else {
            // Legacy plaintext password - verify and migrate to hash
            passwordMatches = user.password === password;
            if (passwordMatches) {
                // Migrate to hashed password
                const hashedPassword = await hashPassword(password);
                user.password = hashedPassword;
                await user.save();
            }
        }
        
            if (passwordMatches) {
                const obj = user.toObject();
                const userData = {
                    id: obj._id.toString(),
                    username: obj.username,
                    name: obj.name,
                    role: obj.role as "admin" | "user",
                    // Do not return password
                };
                
                // Set session cookie for API authentication
                const cookieStore = await cookies();
                cookieStore.set("auth_session", JSON.stringify({ userId: userData.id }), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                });
                
                return userData;
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
            
            // Set session cookie
            if (userId) {
                const cookieStore = await cookies();
                cookieStore.set("auth_session", JSON.stringify({ userId }), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                });
            }
        } catch (e) {
            console.error("Failed to auto-migrate mock user", e);
        }
        return { ...mockUser, password: undefined };
    }

    return null;
}
