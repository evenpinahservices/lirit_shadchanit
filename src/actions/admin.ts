"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import InviteTokenModel from "@/models/InviteToken";
import AuditLogModel from "@/models/AuditLog";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/serverAuth";
import { getClientModel } from "@/models/Client";
import { isValidObjectId } from "@/lib/validation";
import { User } from "@/lib/mockData";
import { isHebrew } from "@/lib/utils";
import { signSession, parseSession } from "@/lib/session";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSummary {
    id: string;
    username: string;
    name: string;
    email?: string;
    phone?: string;
    profilePhotoUrl?: string;
    role: "admin" | "user";
    dbName?: string;
    clientCount: number;
    createdAt: string;
}

export interface InviteTokenSummary {
    id: string;
    token: string;
    createdAt: string;
    expiresAt: string;
    url: string;
}

// ─── User listing ─────────────────────────────────────────────────────────────

export async function listUsers(): Promise<UserSummary[]> {
    await requireAdmin();
    await dbConnect();

    const users = await UserModel.find({}).sort({ createdAt: -1 }).lean();

    const results = await Promise.all(
        users.map(async (u: any) => {
            let clientCount = 0;
            try {
                clientCount = await getUserClientCount(u.dbName || undefined);
            } catch {
                // Non-fatal — leave as 0
            }
            return {
                id: u._id.toString(),
                username: u.username,
                name: u.name,
                email: u.email || undefined,
                phone: u.phone || undefined,
                profilePhotoUrl: u.profilePhotoUrl || undefined,
                role: u.role as "admin" | "user",
                dbName: u.dbName || undefined,
                clientCount,
                createdAt: u.createdAt?.toISOString() || new Date().toISOString(),
            };
        })
    );

    return results;
}

// ─── Client count helper ───────────────────────────────────────────────────────

export async function getUserClientCount(dbName?: string): Promise<number> {
    const conn = await dbConnect(dbName);
    const Model = getClientModel(conn);
    return Model.countDocuments();
}

// ─── Invite token generation ───────────────────────────────────────────────────

export async function createInviteToken(): Promise<InviteTokenSummary> {
    const admin = await requireAdmin();
    await dbConnect();

    const token = crypto.randomBytes(32).toString("hex"); // 64-char hex
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await InviteTokenModel.create({
        token,
        createdBy: admin.id,
        expiresAt,
    });

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://your-domain.com"
            : "http://localhost:3000");

    return {
        id: token,
        token,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        url: `${baseUrl}/signup?invite=${token}`,
    };
}

// ─── List pending invites ──────────────────────────────────────────────────────

export async function listPendingInvites(): Promise<InviteTokenSummary[]> {
    await requireAdmin();
    await dbConnect();

    const now = new Date();
    const tokens = await InviteTokenModel.find({
        usedAt: { $exists: false },
        expiresAt: { $gt: now },
    })
        .sort({ createdAt: -1 })
        .lean();

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://your-domain.com"
            : "http://localhost:3000");

    return tokens.map((t: any) => ({
        id: t._id.toString(),
        token: t.token,
        createdAt: t.createdAt?.toISOString() || "",
        expiresAt: t.expiresAt?.toISOString() || "",
        url: `${baseUrl}/signup?invite=${t.token}`,
    }));
}

// ─── User registration (public — token is the auth) ───────────────────────────

export interface RegisterUserInput {
    username: string;
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
    profilePhotoUrl?: string;
}

export async function validateInviteToken(token: string): Promise<boolean> {
    if (!token || token.length !== 64) return false;
    await dbConnect();
    const doc = await InviteTokenModel.findOne({ token }).lean();
    if (!doc) return false;
    if (doc.usedAt) return false;
    if (new Date() > doc.expiresAt) return false;
    return true;
}

export async function registerUser(
    token: string,
    data: RegisterUserInput
): Promise<User> {
    await dbConnect();

    // Validate token
    const tokenDoc = await InviteTokenModel.findOne({ token });
    if (!tokenDoc) throw new Error("Invalid invite link.");
    if (tokenDoc.usedAt) throw new Error("This invite link has already been used.");
    if (new Date() > tokenDoc.expiresAt) throw new Error("This invite link has expired.");

    // Validate username uniqueness
    const normalizedUsername = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
        throw new Error("Username must be 3–30 characters (letters, numbers, underscores only).");
    }
    const existing = await UserModel.findOne({ username: normalizedUsername });
    if (existing) throw new Error("That username is already taken.");

    if (!data.password || data.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
    }

    const hashedPassword = await hashPassword(data.password);
    const dbName = `shadchanit_${normalizedUsername}`;

    const newUser = await UserModel.create({
        username: normalizedUsername,
        name: data.fullName.trim(),
        email: data.email?.trim().toLowerCase() || undefined,
        phone: data.phone?.trim() || undefined,
        password: hashedPassword,
        role: "user",
        dbName,
        profilePhotoUrl: data.profilePhotoUrl || undefined,
    });

    // Mark token used
    tokenDoc.usedAt = new Date();
    tokenDoc.usedBy = newUser._id;
    await tokenDoc.save();

        // Auto-login: set auth_session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_session", signSession({ userId: newUser._id.toString() }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return {
        id: newUser._id.toString(),
        username: newUser.username,
        name: newUser.name,
        role: "user",
        dbName,
        email: newUser.email || undefined,
        phone: newUser.phone || undefined,
        profilePhotoUrl: newUser.profilePhotoUrl || undefined,
    };
}

// ─── Delete user ───────────────────────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<void> {
    await requireAdmin();
    if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
    await dbConnect();

    const user = await UserModel.findById(userId).lean();
    if (!user) throw new Error("User not found.");

    // Drop the user's database if they have one
    if ((user as any).dbName) {
        try {
            const conn = await dbConnect((user as any).dbName);
            await conn.db?.dropDatabase();
        } catch (e) {
            console.error("Failed to drop user DB:", e);
        }
    }

    await UserModel.findByIdAndDelete(userId);

    // Clean up any invite tokens created by this user
    await InviteTokenModel.deleteMany({ createdBy: userId });
}

// ─── Reset password ────────────────────────────────────────────────────────────

export async function resetUserPassword(userId: string): Promise<string> {
    await requireAdmin();
    if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
    await dbConnect();

    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found.");

    const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789";
    const newPassword = Array.from({ length: 12 })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join("");

    user.password = await hashPassword(newPassword);
    await user.save();

    return newPassword;
}

// ─── Impersonation ─────────────────────────────────────────────────────────────

export async function startImpersonation(targetUserId: string): Promise<User> {
    const admin = await requireAdmin();
    if (!isValidObjectId(targetUserId)) throw new Error("Invalid user ID.");
    await dbConnect();

    const targetUser = await UserModel.findById(targetUserId).lean() as any;
    if (!targetUser) throw new Error("User not found.");

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");
    if (!sessionCookie?.value) throw new Error("No session.");
    const sessionData = parseSession(sessionCookie.value);
    if (!sessionData) throw new Error("Invalid session.");

    cookieStore.set(
        "auth_session",
        signSession({ ...sessionData, impersonatingId: targetUserId }),
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE_SECONDS,
        }
    );

    // Audit log — fire-and-forget, non-fatal
    AuditLogModel.create({
        action: "impersonation_start",
        actorId: admin.id,
        actorUsername: admin.username,
        targetId: targetUserId,
        targetUsername: targetUser.username,
    }).catch((e: unknown) => console.error("[audit] Failed to write audit log:", e));

    return {
        id: targetUser._id.toString(),
        username: targetUser.username,
        name: targetUser.name,
        role: targetUser.role as "admin" | "user",
        dbName: targetUser.dbName || undefined,
    };
}

export async function stopImpersonation(): Promise<void> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");
    if (!sessionCookie?.value) return;

    const sessionData = parseSession(sessionCookie.value);
    if (!sessionData) return;

    const { impersonatingId: _removed, ...rest } = sessionData as Record<string, unknown>;

    cookieStore.set("auth_session", signSession(rest), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // Audit log — fire-and-forget
    if (_removed) {
        const { getCurrentUser } = await import("@/lib/serverAuth");
        const user = await getCurrentUser().catch(() => null);
        if (user) {
            AuditLogModel.create({
                action: "impersonation_stop",
                actorId: user.id,
                actorUsername: user.username,
            }).catch((e: unknown) => console.error("[audit] Failed to write audit log:", e));
        }
    }
}

// ─── Migrate unnamed Hebrew clients ───────────────────────────────────────────

export interface MigrateUnnamedResult {
    scanned: number;
    renamed: number;
    details: { user: string; renamed: number }[];
}

export async function migrateUnnamedHebrewClients(): Promise<MigrateUnnamedResult> {
    await requireAdmin();
    await dbConnect();

    const users = await UserModel.find({ dbName: { $exists: true, $ne: null } }).lean();
    let totalScanned = 0;
    let totalRenamed = 0;
    const details: { user: string; renamed: number }[] = [];

    for (const u of users as any[]) {
        const conn = await dbConnect(u.dbName);
        const Model = getClientModel(conn);

        const unnamed = await Model.find({
            $or: [
                { fullName: { $exists: false } },
                { fullName: null },
                { fullName: "" },
                { fullName: /^\s*$/ },
            ],
        }).lean();

        totalScanned += unnamed.length;
        let userRenamed = 0;

        for (const client of unnamed as any[]) {
            const isHebrewProfile =
                client.formLanguage === "he" ||
                [client.location, client.personality, client.hobbies, client.familyBackground, client.notes, client.education, client.references]
                    .some((f: unknown) => typeof f === "string" && isHebrew(f));

            if (isHebrewProfile) {
                await Model.updateOne({ _id: client._id }, { $set: { fullName: "ללא שם" } });
                userRenamed++;
            }
        }

        totalRenamed += userRenamed;
        if (unnamed.length > 0) {
            details.push({ user: u.username, renamed: userRenamed });
        }
    }

    return { scanned: totalScanned, renamed: totalRenamed, details };
}
