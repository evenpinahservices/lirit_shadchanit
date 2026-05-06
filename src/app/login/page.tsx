"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { brands, currentBrandId, type BrandId } from "@/config/branding";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [brandId] = useState<BrandId>(() => {
        if (typeof window !== "undefined") {
            const hint = localStorage.getItem("loginBrandHint");
            if (hint === "lirit" || hint === "default") return hint;
        }
        return currentBrandId;
    });
    const { login } = useAuth();
    const submittingRef = useRef(false);

    const brand = brands[brandId];

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setError("");
        if (!username.trim() || !password.trim()) {
            submittingRef.current = false;
            return;
        }
        setIsLoading(true);

        // Hard 20-second timeout — if the server action hangs, the user can retry
        const timeoutId = setTimeout(() => {
            console.error("[login] client-side 20s timeout hit — server action did not resolve");
            setError("Login is taking too long — please try again.");
            setIsLoading(false);
            submittingRef.current = false;
        }, 20000);

        try {
            console.log("[login] client: calling login()");
            const result = await login(username, password);
            console.log("[login] client: login() resolved, ok=", result.ok);
            clearTimeout(timeoutId);
            if (!result.ok) {
                setError(result.error);
                setIsLoading(false);
                submittingRef.current = false;
            } else {
                // Hard navigation: bypasses Next.js router state issues that prevent
                // router.push("/") from working reliably after a server action completes
                window.location.href = "/";
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.error("[login] client: unexpected throw:", err);
            setError("Unexpected error — please try again.");
            setIsLoading(false);
            submittingRef.current = false;
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 z-50">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-950 p-8 rounded-xl shadow-lg">
                <div className="flex flex-col items-center text-center">
                    {brand.logoNavbar ? (
                        <div className="w-24 h-24 mb-4 shrink-0 flex items-center justify-center">
                            <Image src={brand.logoNavbar} alt={brand.shortName} width={96} height={96} className="w-full h-full object-contain block" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 mb-4 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-red-100 dark:bg-red-950/50">
                            <Heart className="w-12 h-12 text-red-500 fill-red-500" />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold tracking-tight">Sign in to {brand.shortName}</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Enter your credentials to access the dashboard
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md text-center">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    className="block w-full rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-sm dark:bg-gray-900"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="block w-full rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-sm dark:bg-gray-900"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleSubmit()}
                        className="flex w-full justify-center items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Logging in…
                            </>
                        ) : "Sign in"}
                    </button>
                </form>
            </div>
        </div>
    );
}
