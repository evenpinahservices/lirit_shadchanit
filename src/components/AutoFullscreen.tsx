"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AutoFullscreen() {
    const pathname = usePathname();

    useEffect(() => {
        // Don't auto-fullscreen on login page
        if (pathname === "/login") {
            return;
        }

        // Check if user has disabled auto-fullscreen (opt-out)
        const autoFullscreenDisabled = localStorage.getItem('autoFullscreenDisabled') === 'true';
        if (autoFullscreenDisabled) {
            return;
        }

        // Only attempt fullscreen if not already in fullscreen
        if (!document.fullscreenElement) {
            // Small delay to ensure page is loaded and user interaction is possible
            // Note: Most browsers require user interaction for fullscreen, so this may not work on initial load
            // But we try anyway - it will work if browser allows it
            const timer = setTimeout(() => {
                document.documentElement.requestFullscreen().catch(err => {
                    // Silently fail - fullscreen requires user interaction in most browsers
                    // This is expected behavior and not an error
                    console.log('Auto-fullscreen not available (requires user interaction in most browsers)');
                });
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [pathname]);

    return null;
}

