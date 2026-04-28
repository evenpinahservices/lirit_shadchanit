"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/lib/mockData";
import { useRouter, usePathname } from "next/navigation";
import { loginUser, verifySession, logoutSession } from "@/actions/auth";
import { stopImpersonation } from "@/actions/admin";

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
    logout: () => void;
    isAuthenticated: boolean;
    impersonatingUsername: string | null;
    stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(() => {
        localStorage.removeItem("mock_user");
        logoutSession().catch(() => {});
        window.location.replace("/login");
    }, []);

    const stopImpersonating = useCallback(async () => {
        await stopImpersonation();
        // Refresh the session to pick up the real user again
        const serverUser = await verifySession();
        if (serverUser) {
            setUser(serverUser);
            localStorage.setItem("mock_user", JSON.stringify(serverUser));
        }
        router.push("/admin");
        router.refresh();
    }, [router]);

    // Verify the server-side session is still valid
    const checkSession = useCallback(async () => {
        const storedUser = localStorage.getItem("mock_user");
        if (!storedUser) return;

        // Skip session checks on public pages (login, external forms)
        if (pathname.startsWith("/form/") || pathname === "/login") return;

        try {
            const serverUser = await verifySession();
            if (!serverUser) {
                console.warn("Server session expired — logging out");
                logout();
            }
        } catch {
            // Network error — don't logout, just skip this check
        }
    }, [pathname, logout]);

    // Load user from localStorage on mount, then verify with server
    useEffect(() => {
        const storedUser = localStorage.getItem("mock_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        checkSession();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Periodic session health check
    useEffect(() => {
        if (!user) {
            if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
            return;
        }
        sessionCheckRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);
        return () => {
            if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
        };
    }, [user, checkSession]);

    // Instant logout on 401 from any API call
    useEffect(() => {
        const handler = () => {
            if (user) {
                console.warn("Session expired event received — logging out");
                logout();
            }
        };
        window.addEventListener("session-expired", handler);
        return () => window.removeEventListener("session-expired", handler);
    }, [user, logout]);

    const login = async (username: string, password?: string): Promise<{ ok: true } | { ok: false; error: string }> => {
        try {
            const foundUser = await loginUser(username, password);
            if (foundUser) {
                setUser(foundUser);
                localStorage.setItem("mock_user", JSON.stringify(foundUser));
                localStorage.setItem("loginBrandHint", foundUser.role === "admin" ? "lirit" : "default");
                router.push("/");
                return { ok: true };
            }
            return { ok: false, error: "Invalid username or password" };
        } catch (error: any) {
            console.error("Login failed", error);
            const msg = error?.message || "";
            if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("serverSelection")) {
                return { ok: false, error: "Cannot reach server — check your connection and try again" };
            }
            return { ok: false, error: "Something went wrong, please try again" };
        }
    };

    const impersonatingUsername = (user as any)?.impersonating || null;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, impersonatingUsername, stopImpersonating }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
