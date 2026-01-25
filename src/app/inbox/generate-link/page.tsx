"use client";

import { useState, useEffect } from "react";
import { generateFormToken } from "@/actions/pendingClient";
import { verifySession } from "@/actions/auth";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function GenerateLinkPage() {
    const router = useRouter();
    const { logout, user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);

    // Verify server session on mount
    useEffect(() => {
        const checkSession = async () => {
            if (user) {
                // If user is in localStorage, verify server session exists
                const serverUser = await verifySession();
                if (!serverUser) {
                    // Server session is missing, redirect to login
                    console.warn("Server session missing, redirecting to login");
                    logout();
                    return;
                }
            }
            setIsVerifying(false);
        };
        checkSession();
    }, [user, logout]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const newToken = await generateFormToken();
            setToken(newToken);
        } catch (error: any) {
            console.error("Failed to generate token:", error);
            const errorMessage = error.message || error;
            
            // If authentication error, redirect to login
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("Authentication required")) {
                alert("Your session has expired. Please log in again.");
                // Clear localStorage and redirect to login
                logout();
                return;
            }
            
            alert("Failed to generate link: " + errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const formUrl = token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${token}` : null;

    const handleCopy = async () => {
        if (!formUrl) return;
        try {
            await navigator.clipboard.writeText(formUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 gap-4">
            <div className="flex items-center gap-4 shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Generate Form Link</h1>
                    <p className="text-muted-foreground">
                        Create a shareable link for clients to fill out the registration form.
                    </p>
                </div>
            </div>

            {isVerifying ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Verifying session...</p>
                    </div>
                </div>
            ) : (
            <div className="flex-1 flex items-center justify-center">
                <div className="max-w-2xl w-full space-y-6 p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-2xl shadow-xl backdrop-blur-sm">
                    {!token ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                                <LinkIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold mb-2">Generate Client Form Link</h2>
                                <p className="text-muted-foreground mb-6">
                                    Click the button below to generate a unique link that you can share with clients. 
                                    When they submit the form, it will appear in your inbox for approval.
                                </p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="h-5 w-5" />
                                        Generate Link
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Link Generated Successfully!</h2>
                                <p className="text-muted-foreground mb-6">
                                    Copy and share this link with your client. They can use it to fill out the registration form.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Form Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formUrl || ""}
                                        readOnly
                                        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                <p className="text-sm text-muted-foreground mb-4">
                                    <strong>Note:</strong> This link can be shared with multiple people. Each person who submits the form will create a separate pending entry in your inbox. The profiles will not overlap - each submission is independent.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGenerate}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors"
                                    >
                                        Generate New Link
                                    </button>
                                    <Link
                                        href="/inbox"
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        Go to Inbox
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}
