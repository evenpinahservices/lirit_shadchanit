"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { loginUser } from "@/actions/auth";

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    // Load user from localStorage on mount (simple persistence)
    useEffect(() => {
        const storedUser = localStorage.getItem("mock_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (username: string, password?: string) => {
        try {
            const foundUser = await loginUser(username, password);

            if (foundUser) {
                setUser(foundUser);
                // Keep local storage for simple persistence/caching if desired, 
                // but real auth should use cookies/session. 
                // We'll keep it simple as per request.
                localStorage.setItem("mock_user", JSON.stringify(foundUser));
                router.push("/");
                return true;
            }
        } catch (error) {
            console.error("Login failed", error);
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("mock_user");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
