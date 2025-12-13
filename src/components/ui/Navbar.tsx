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

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="border-b bg-white dark:bg-gray-950 px-6 py-4 sticky top-0 z-50 shadow-sm">
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

                {/* Desktop User Menu */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        <UserIcon className="h-4 w-4" />
                        <span>{user.name} ({user.role})</span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? (
                        <LogOut className="h-6 w-6 rotate-45" /> // Using LogOut rotate as close icon substitute or just X
                    ) : (
                        <div className="space-y-1.5">
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                        </div>
                    )}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden pt-4 pb-2 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-col space-y-3">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                                        isActive ? "bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400" : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                            <span>{user.name} ({user.role})</span>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
