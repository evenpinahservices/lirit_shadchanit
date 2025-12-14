"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users, Heart, Search, LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    if (!user) return null; // Don't show navbar if not logged in

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/matching", label: "Matching", icon: Heart },
        { href: "/search", label: "Search", icon: Search },
    ];

    return (
        <nav className="border-b bg-white dark:bg-gray-950 px-6 py-4 sticky top-0 z-50 shadow-sm shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
                        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                        <span>ShadchanitDB</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
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
                </div>

                {/* User Menu - Visible on all screens now */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        <UserIcon className="h-4 w-4" />
                        <span>{user.name} ({user.role})</span>
                    </div>
                    {/* Simplified User Icon for Mobile */}
                    <div className="md:hidden flex items-center justify-center p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                        <UserIcon className="h-5 w-5" />
                    </div>

                    <button
                        onClick={logout}
                        className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden md:inline">Logout</span>
                        <span className="md:hidden sr-only">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
