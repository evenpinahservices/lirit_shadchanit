"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Heart, Search, StickyNote, Hourglass } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    // Hide bottom nav on login page and external form pages
    if (pathname === "/login" || pathname.startsWith("/form/")) {
        return null;
    }

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/inbox", label: "Pending", icon: Hourglass },
        { href: "/matching", label: "Matching", icon: Heart },
        { href: "/search", label: "Search", icon: Search },
        { href: "/notes", label: "Notes", icon: StickyNote },
    ];

    return (
        <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-900 z-50 pb-[env(safe-area-inset-bottom)] shadow-sm border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-around h-16 px-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                        pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                                isActive 
                                    ? "text-primary" 
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div >
    );
}
