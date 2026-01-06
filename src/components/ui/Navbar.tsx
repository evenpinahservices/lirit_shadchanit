"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users, Heart, Search, LogOut, User as UserIcon, Maximize, Minimize, HelpCircle, StickyNote } from "lucide-react";
import { useOnboardingTour } from "@/components/OnboardingTour";
import { BugReportButton } from "@/components/ui/BugReportButton";

export function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { startTour, isRunning: isTourRunning } = useOnboardingTour();

    // if (!user) return null; // Allow navbar to show for logged out users (for bug reporting)

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/matching", label: "Matching", icon: Heart },
        { href: "/search", label: "Search", icon: Search },
        { href: "/notes", label: "Notes", icon: StickyNote },
    ];

    return (
        <nav className="border-b bg-white dark:bg-gray-950 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-50 shadow-sm shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
                        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                        <span>ShadchanitDB</span>
                    </Link>
                    {user && (
                        <div id="desktop-nav-links" className="hidden md:flex items-center gap-6">
                            {links.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* User Menu - Visible on all screens now */}
                <div className="flex items-center gap-4">
                    {user && (
                        <button
                            onClick={startTour}
                            disabled={isTourRunning}
                            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Start Tutorial"
                        >
                            <HelpCircle className="h-5 w-5" />
                        </button>
                    )}

                    <BugReportButton />

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>

                    {user && (
                        <button
                            onClick={logout}
                            id="tour-logout-btn"
                            className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden md:inline">Logout</span>
                            <span className="md:hidden sr-only">Logout</span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
