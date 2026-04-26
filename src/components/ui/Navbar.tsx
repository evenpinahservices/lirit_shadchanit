"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getBrand } from "@/config/branding";
import { LayoutDashboard, Users, Heart, Search, LogOut, Maximize2, Minimize2, StickyNote, Hourglass, ShieldCheck } from "lucide-react";
import { BugReportButton } from "@/components/ui/BugReportButton";
import { useBackgroundAiProgress } from "@/context/BackgroundAiProgressContext";
import { CircularProgress } from "@/components/ui/CircularProgress";

/** True when running as installed PWA (standalone/fullscreen/minimal-ui), not in browser tab */
function useIsPwa() {
    const [isPwa, setIsPwa] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const check = () => {
            const mqStandalone = window.matchMedia("(display-mode: standalone)");
            const mqFullscreen = window.matchMedia("(display-mode: fullscreen)");
            const mqMinimal = window.matchMedia("(display-mode: minimal-ui)");
            const iosStandalone = (navigator as any).standalone === true;
            const isStandalone = mqStandalone.matches || mqFullscreen.matches || mqMinimal.matches || iosStandalone;
            setIsPwa(!!isStandalone);
        };
        check();
        const mq = window.matchMedia("(display-mode: standalone)");
        mq.addEventListener?.("change", check);
        return () => mq.removeEventListener?.("change", check);
    }, []);
    return isPwa;
}

export function Navbar() {
    const pathname = usePathname();
    const { user, logout, impersonatingUsername, stopImpersonating } = useAuth();
    const aiProgress = useBackgroundAiProgress();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isPwa = useIsPwa();

    const toggleFullscreen = useCallback(() => {
        if (typeof document === "undefined") return;
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/inbox", label: "Pending", icon: Hourglass },
        { href: "/matching", label: "Matching", icon: Heart },
        { href: "/search", label: "Search", icon: Search },
        { href: "/notes", label: "Notes", icon: StickyNote },
    ];

    // Hide navbar on login/signup pages and external form pages
    if (pathname === "/login" || pathname === "/signup" || pathname.startsWith("/form/")) {
        return null;
    }

    const brand = getBrand();

    return (
        <nav className="sticky top-0 z-10 shadow-sm shrink-0">
            {impersonatingUsername && (
                <div className="bg-amber-400 text-amber-900 text-xs font-semibold px-4 py-1.5 flex items-center justify-between">
                    <span>Viewing as @{impersonatingUsername}</span>
                    <button
                        onClick={stopImpersonating}
                        className="underline hover:no-underline ml-4"
                    >
                        Stop impersonating
                    </button>
                </div>
            )}
        <div className="bg-gray-50 dark:bg-gray-900 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
                <div className="flex items-center gap-4 sm:gap-6 md:gap-8 min-w-0 flex-shrink">
                    <Link href="/" className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                        {brand.logoNavbar ? (
                            <Image src={brand.logoNavbar} alt={brand.shortName} width={36} height={36} className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0 -mt-0.5" />
                        ) : (
                            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 fill-red-500" />
                        )}
                        <span className="hidden sm:inline">{brand.shortName}</span>
                        <span className="sm:hidden">SDB</span>
                    </Link>
                    {user && (
                        <div id="desktop-nav-links" className="hidden md:flex items-center gap-4 lg:gap-6 flex-shrink min-w-0">
                            {links.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                                            isActive ? "text-primary" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="hidden lg:inline">{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* User Menu - Visible on all screens now */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                    {user && aiProgress?.isProcessing && (
                        <button
                            type="button"
                            onClick={aiProgress.restoreOverlay}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Show AI upload progress"
                        >
                            <CircularProgress
                                progress={Math.max(0, Math.min(100, aiProgress.progress))}
                                size={30}
                                strokeWidth={2.5}
                                showPercentage={true}
                            />
                        </button>
                    )}
                    {user && !isPwa && (
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 sm:p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                        </button>
                    )}

                    <div className="flex-shrink-0">
                        <BugReportButton />
                    </div>

                    {user?.role === "admin" && (
                        <Link
                            href="/admin"
                            className={cn(
                                "text-xs sm:text-sm font-medium flex items-center gap-1 shrink-0 px-1 sm:px-0 transition-colors",
                                pathname === "/admin"
                                    ? "text-primary"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                            title="Admin Panel"
                        >
                            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Admin</span>
                        </Link>
                    )}

                    {user && (
                        <button
                            onClick={logout}
                            id="tour-logout-btn"
                            className="text-xs sm:text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1 flex-shrink-0 px-1 sm:px-0"
                        >
                            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
        </nav>
    );
}
