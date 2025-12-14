"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Heart, Search } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/matching", label: "Matching", icon: Heart },
        { href: "/search", label: "Search", icon: Search },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-gray-950 z-50 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                        pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors hover:text-primary",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
