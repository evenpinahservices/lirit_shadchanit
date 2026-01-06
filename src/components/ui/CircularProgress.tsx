"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    showPercentage?: boolean;
    className?: string;
}

export function CircularProgress({
    progress,
    size = 24,
    strokeWidth = 3,
    showPercentage = false,
    className,
}: CircularProgressProps) {
    // If showing percentage, use a larger size to fit the text
    const effectiveSize = showPercentage ? Math.max(size, 40) : size;
    const effectiveStrokeWidth = showPercentage ? Math.max(strokeWidth, 4) : strokeWidth;
    
    const radius = (effectiveSize - effectiveStrokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={effectiveSize}
                height={effectiveSize}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={effectiveSize / 2}
                    cy={effectiveSize / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={effectiveStrokeWidth}
                    className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress circle */}
                <circle
                    cx={effectiveSize / 2}
                    cy={effectiveSize / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={effectiveStrokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="text-red-600 transition-all duration-150 ease-out"
                />
            </svg>
            {showPercentage && (
                <span className="absolute text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {Math.round(progress)}
                </span>
            )}
        </div>
    );
}

