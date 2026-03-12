"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users, Heart, Search, LogOut, Maximize2, Minimize2, StickyNote, Hourglass } from "lucide-react";
import { BugReportButton } from "@/components/ui/BugReportButton";

export function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    // Hide navbar on login page and external form pages
    if (pathname === "/login" || pathname.startsWith("/form/")) {
        return null;
    }

    return (
        <nav className="bg-gray-50 dark:bg-gray-900 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 sticky top-0 z-10 shadow-sm shrink-0">
            <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
                <div className="flex items-center gap-4 sm:gap-6 md:gap-8 min-w-0 flex-shrink">
                    <Link href="/" className="text-lg sm:text-xl font-bold text-primary flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 fill-red-500" />
                        <span className="hidden sm:inline">ShadchanitDB</span>
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
                    {user && (
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
        </nav>
    );
}
