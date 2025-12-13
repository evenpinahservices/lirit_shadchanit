"use server";

import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { User, MOCK_USERS } from "@/lib/mockData";

export async function loginUser(username: string, password?: string): Promise<User | null> {
    await dbConnect();

    // Try to find user in DB
    // This is a case-insensitive search using regex
    const user = await UserModel.findOne({
        username: { $regex: new RegExp(`^${username}$`, "i") },
    });

    if (user) {
        // Simple password check (plaintext for this stage, consistent with request)
        if (user.password === password) {
            const obj = user.toObject();
            return {
                id: obj._id.toString(),
                username: obj.username,
                name: obj.name,
                role: obj.role as "admin" | "user",
                // Do not return password
            };
        }
    }

    // Fallback to MOCK_USERS if DB is empty ( bootstrapping phase )
    // This helps if the admin user hasn't been created in Mongo yet.
    const mockUser = MOCK_USERS.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (mockUser && mockUser.password === password) {
        // If we matched a mock user, let's auto-migrate them to the DB so next time it's real
        try {
            const existing = await UserModel.findOne({ username: mockUser.username });
            if (!existing) {
                await UserModel.create({
                    username: mockUser.username,
                    name: mockUser.name,
                    role: mockUser.role,
                    password: mockUser.password
                });
            }
        } catch (e) {
            console.error("Failed to auto-migrate mock user", e);
        }
        return { ...mockUser, password: undefined };
    }

    return null;
}
