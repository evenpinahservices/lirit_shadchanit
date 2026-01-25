import { useRef, useEffect, useCallback } from 'react';

interface UseSwipeNavigationOptions {
    onSwipeLeft?: () => void;  // Next action
    onSwipeRight?: () => void;  // Previous/Back action
    threshold?: number;         // Minimum distance for a swipe (default: 50px)
    maxTime?: number;           // Maximum time for a swipe (default: 500ms)
    preventDefault?: boolean;   // Prevent default touch behavior (default: true)
    enabled?: boolean;           // Enable/disable swipe (default: true)
}

/**
 * Hook for detecting swipe gestures (both touch and mouse)
 * Supports left swipe (next) and right swipe (previous/back)
 */
export function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    maxTime = 500,
    preventDefault = true,
    enabled = true,
}: UseSwipeNavigationOptions) {
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const mouseStartRef = useRef<{ x: number; y: number; time: number; isDown: boolean } | null>(null);
    const elementRef = useRef<HTMLElement | null>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!enabled || !onSwipeLeft && !onSwipeRight) return;
        
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
        };
    }, [enabled, onSwipeLeft, onSwipeRight]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!touchStartRef.current || !enabled) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Check if it's a horizontal swipe (more horizontal than vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY) && 
            Math.abs(deltaX) >= threshold && 
            deltaTime <= maxTime) {
            
            if (preventDefault) {
                e.preventDefault();
            }

            if (deltaX > 0 && onSwipeRight) {
                // Swipe right (previous/back)
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                // Swipe left (next)
                onSwipeLeft();
            }
        }

        touchStartRef.current = null;
    }, [enabled, threshold, maxTime, preventDefault, onSwipeLeft, onSwipeRight]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!enabled || !onSwipeLeft && !onSwipeRight) return;
        
        mouseStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            time: Date.now(),
            isDown: true,
        };
    }, [enabled, onSwipeLeft, onSwipeRight]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // Prevent text selection during drag
        if (mouseStartRef.current?.isDown && preventDefault) {
            e.preventDefault();
        }
    }, [preventDefault]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!mouseStartRef.current || !enabled || !mouseStartRef.current.isDown) return;

        const deltaX = e.clientX - mouseStartRef.current.x;
        const deltaY = e.clientY - mouseStartRef.current.y;
        const deltaTime = Date.now() - mouseStartRef.current.time;

        // Check if it's a horizontal swipe (more horizontal than vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY) && 
            Math.abs(deltaX) >= threshold && 
            deltaTime <= maxTime) {
            
            if (preventDefault) {
                e.preventDefault();
            }

            if (deltaX > 0 && onSwipeRight) {
                // Swipe right (previous/back)
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                // Swipe left (next)
                onSwipeLeft();
            }
        }

        mouseStartRef.current = null;
    }, [enabled, threshold, maxTime, preventDefault, onSwipeLeft, onSwipeRight]);

    const setRef = useCallback((node: HTMLElement | null) => {
        // Cleanup previous listeners
        if (elementRef.current) {
            elementRef.current.removeEventListener('touchstart', handleTouchStart);
            elementRef.current.removeEventListener('touchend', handleTouchEnd);
            elementRef.current.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        elementRef.current = node;

        // Add new listeners
        if (node && enabled) {
            node.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
            node.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
            node.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    }, [enabled, preventDefault, handleTouchStart, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (elementRef.current) {
                elementRef.current.removeEventListener('touchstart', handleTouchStart);
                elementRef.current.removeEventListener('touchend', handleTouchEnd);
                elementRef.current.removeEventListener('mousedown', handleMouseDown);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleTouchStart, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

    return setRef;
}
