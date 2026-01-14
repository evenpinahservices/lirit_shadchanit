"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Helper function to detect if device is a laptop (not mobile/tablet)
function isLaptop(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for touch capability - laptops typically don't have touch screens
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check screen width - laptops typically have larger screens
    const isLargeScreen = window.innerWidth >= 1024;
    
    // Check for pointer device (mouse) - laptops have pointer devices
    const hasPointerDevice = window.matchMedia('(pointer: fine)').matches;
    
    // Laptop detection: large screen, has pointer device, and typically no touch (or limited touch)
    // Some modern laptops have touch screens, so we check if it's primarily a pointer device
    return isLargeScreen && hasPointerDevice && (!hasTouchScreen || window.matchMedia('(any-pointer: fine)').matches);
}

export function AutoFullscreen() {
    const pathname = usePathname();

    useEffect(() => {
        // Don't auto-fullscreen on login page
        if (pathname === "/login") {
            return;
        }

        // Don't auto-fullscreen on laptop mode
        if (isLaptop()) {
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




