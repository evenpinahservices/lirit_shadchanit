"use client";

import { useEffect } from "react";

/**
 * Component that handles auto-scrolling when keyboard opens on mobile devices
 * Ensures input fields scroll into view and scrolling works when viewport is pushed up
 */
export function KeyboardScrollHandler() {
    useEffect(() => {
        // Only run on mobile and tablet devices (touch devices where keyboard appears)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobileOrTablet = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (isTouchDevice && window.innerWidth < 1024);
        if (!isMobileOrTablet) return;

        let activeElement: HTMLElement | null = null;
        let initialViewportHeight = window.innerHeight;

        // Find the scrollable container (usually the main content area)
        const findScrollableContainer = (element: HTMLElement): HTMLElement | null => {
            let parent = element.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                const overflowY = style.overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll' || parent.classList.contains('custom-scrollbar')) {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return null;
        };

        const ensureInputVisible = (element: HTMLElement) => {
            const container = findScrollableContainer(element);
            const rect = element.getBoundingClientRect();
            
            // Use visual viewport if available (accounts for keyboard)
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const availableHeight = viewportHeight;
            const padding = 80; // Padding from keyboard (more space for suggestion bar)
            
            // Check if input is visible in the reduced viewport
            if (rect.bottom > availableHeight - padding || rect.top < padding) {
                if (container && container !== document.documentElement) {
                    // Scroll within container
                    const containerRect = container.getBoundingClientRect();
                    const containerScrollTop = container.scrollTop;
                    const elementOffsetTop = rect.top - containerRect.top + containerScrollTop;
                    
                    // Position input in upper portion of visible area (leaves room for suggestion bar at bottom)
                    const targetTop = availableHeight * 0.25; // Upper quarter
                    const targetScroll = elementOffsetTop - targetTop;
                    
                    container.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                } else {
                    // Scroll window/document - position in upper portion
                    const targetTop = availableHeight * 0.25;
                    const scrollOffset = rect.top - targetTop + window.scrollY;
                    window.scrollTo({
                        top: Math.max(0, scrollOffset),
                        behavior: 'smooth'
                    });
                }
            }
        };

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            
            // Only handle input, textarea, and select elements
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                activeElement = target;
                initialViewportHeight = window.innerHeight;
                
                // Find scrollable container
                const container = findScrollableContainer(target);
                
                // CRITICAL: Position input correctly BEFORE browser calculates autofill suggestion bar
                // We need to scroll the input to a position where it's visible in the visual viewport
                // Use requestAnimationFrame to ensure this happens before browser renders
                requestAnimationFrame(() => {
                    if (document.activeElement === target) {
                        // Get current position
                        const rect = target.getBoundingClientRect();
                        const viewportHeight = window.visualViewport?.height || window.innerHeight;
                        
                        // Calculate where input should be (center of visible area, accounting for keyboard)
                        const targetTop = viewportHeight * 0.3; // Position in upper third of visible area
                        
                        if (container && container !== document.documentElement) {
                            // Scroll within container
                            const containerRect = container.getBoundingClientRect();
                            const currentTop = rect.top - containerRect.top;
                            const scrollOffset = currentTop - targetTop + container.scrollTop;
                            
                            container.scrollTo({
                                top: Math.max(0, scrollOffset),
                                behavior: 'instant'
                            });
                        } else {
                            // Scroll window
                            const scrollOffset = rect.top - targetTop + window.scrollY;
                            window.scrollTo({
                                top: Math.max(0, scrollOffset),
                                behavior: 'instant'
                            });
                        }
                    }
                });
                
                // Also check after keyboard appears (viewport resize) to fine-tune
                const checkAfterKeyboard = () => {
                    if (activeElement && document.activeElement === activeElement) {
                        ensureInputVisible(activeElement);
                    }
                };

                // Check multiple times as keyboard animates
                setTimeout(checkAfterKeyboard, 100);
                setTimeout(checkAfterKeyboard, 300);
                setTimeout(checkAfterKeyboard, 500);
            }
        };

        const handleFocusOut = () => {
            activeElement = null;
            initialViewportHeight = window.innerHeight;
        };

        // Handle viewport resize (keyboard show/hide)
        const handleResize = () => {
            if (activeElement && document.activeElement === activeElement) {
                // Viewport changed (keyboard appeared/disappeared) - ensure input is still visible
                ensureInputVisible(activeElement);
            }
        };

        // Listen for focus events and viewport resize
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        window.addEventListener('resize', handleResize);
        // Also listen for visual viewport changes (better for mobile keyboards)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', () => {
                // When scrolling in reduced viewport, ensure active input stays visible
                if (activeElement && document.activeElement === activeElement) {
                    ensureInputVisible(activeElement);
                }
            });
        }

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            window.removeEventListener('resize', handleResize);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, []);

    return null; // This component doesn't render anything
}
