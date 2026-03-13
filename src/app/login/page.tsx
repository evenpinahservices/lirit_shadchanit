"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBrand } from "@/config/branding";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (username.trim() && password.trim()) {
            const success = await login(username, password);
            if (!success) {
                setError("Invalid username or password");
            }
        }
    };

    const brand = getBrand();

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 z-50">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-950 p-8 rounded-xl shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-24 h-24 mb-4 shrink-0 flex items-center justify-center [&_img]:block ${brand.logoNavbar ? "" : "rounded-full overflow-hidden bg-red-100 dark:bg-red-950/50"}`}>
                        {brand.logoNavbar ? (
                            <Image src={brand.logoNavbar} alt={brand.shortName} width={96} height={96} className="w-full h-full object-contain block" />
                        ) : (
                            <Heart className="w-12 h-12 text-red-500 fill-red-500" />
                        )}
                    </div>
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
                                    className="block w-full rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-sm dark:bg-gray-900"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
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
                                    className="block w-full rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-sm dark:bg-gray-900"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
                    >
                        Sign in
                    </button>
                </form>
            </div>
        </div>
    );
}

