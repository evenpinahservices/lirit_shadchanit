"use client";

import { useEffect } from "react";

/**
 * Component that handles auto-scrolling when keyboard opens on mobile devices
 * Ensures input fields remain visible above the keyboard
 */
export function KeyboardScrollHandler() {
    useEffect(() => {
        // Only run on mobile and tablet devices (touch devices where keyboard appears)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobileOrTablet = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (isTouchDevice && window.innerWidth < 1024);
        if (!isMobileOrTablet) return;

        let activeElement: HTMLElement | null = null;
        let originalScrollBehavior: ScrollBehavior | null = null;

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            
            // Only handle input, textarea, and select elements
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                activeElement = target;
                
                // Wait a bit for keyboard to appear
                setTimeout(() => {
                    if (activeElement && document.activeElement === activeElement) {
                        // Get the element's position
                        const rect = activeElement.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        
                        // Estimate keyboard height (typically 200-300px on mobile)
                        // We'll use a conservative estimate and scroll to ensure element is visible
                        const estimatedKeyboardHeight = 250;
                        const availableHeight = viewportHeight - estimatedKeyboardHeight;
                        
                        // If element is below the available area, scroll it into view
                        if (rect.bottom > availableHeight) {
                            // Calculate how much to scroll
                            const scrollAmount = rect.bottom - availableHeight + 20; // 20px padding
                            
                            // Scroll the element into view
                            activeElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                                inline: 'nearest'
                            });
                            
                            // Also scroll the window if needed
                            if (window.scrollY + scrollAmount > 0) {
                                window.scrollBy({
                                    top: scrollAmount,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    }
                }, 300); // Wait 300ms for keyboard animation
            }
        };

        const handleFocusOut = () => {
            activeElement = null;
        };

        // Listen for focus events
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    return null; // This component doesn't render anything
}
