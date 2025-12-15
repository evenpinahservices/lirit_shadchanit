"use client";

import { useEffect, useState } from "react";

/**
 * MobileViewportScaler Component
 * 
 * This component wraps the entire application and applies a CSS scale transform
 * on mobile devices to ensure consistent rendering across different screen resolutions.
 * 
 * It scales the content to fit a "reference" mobile width (375px - iPhone SE/6/7/8 width),
 * so the layout appears identical regardless of the device's actual resolution.
 * 
 * This only applies to screens narrower than 768px (md breakpoint).
 */

const REFERENCE_WIDTH = 375; // Reference mobile viewport width (iPhone SE)
const MOBILE_BREAKPOINT = 768;

export function MobileViewportScaler({ children }: { children: React.ReactNode }) {
    const [scale, setScale] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;

            if (width < MOBILE_BREAKPOINT) {
                setIsMobile(true);
                // Calculate scale: current width / reference width
                // If screen is smaller than reference, scale down
                // If screen is larger, scale up (but cap at 1 to avoid making it larger than intended)
                const newScale = Math.min(width / REFERENCE_WIDTH, 1);
                setScale(newScale);
            } else {
                setIsMobile(false);
                setScale(1);
            }
        };

        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    // On desktop or if scale is 1, render children normally
    if (!isMobile || scale === 1) {
        return <>{children}</>;
    }

    // On mobile, wrap in a scaled container
    return (
        <div
            style={{
                width: `${100 / scale}%`,
                height: `${100 / scale}%`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                overflow: "hidden",
            }}
        >
            {children}
        </div>
    );
}
