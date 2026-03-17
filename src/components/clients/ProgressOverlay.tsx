"use client";

import { memo } from "react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { Minimize2 } from "lucide-react";

/** Memoized so the blur layer does not re-render when progress/status change (avoids flash). */
const ProgressOverlayBackdrop = memo(function ProgressOverlayBackdrop({ isVisible }: { isVisible: boolean }) {
    if (!isVisible) return null;
    return <div className="fixed inset-0 z-100 backdrop-blur-md bg-black/40" aria-hidden />;
});

interface ProgressOverlayProps {
    isVisible: boolean;
    status: string;
    subStatus?: string;
    progress?: number; // 0-100
    onMinimize?: () => void;
    onCancel?: () => void;
}

export function ProgressOverlay({
    isVisible,
    status,
    subStatus,
    progress = 0,
    onMinimize,
    onCancel,
}: ProgressOverlayProps) {
    if (!isVisible) return null;

    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
        <>
            <ProgressOverlayBackdrop isVisible={isVisible} />
            <div className="fixed inset-0 z-100 flex items-center justify-center" dir="ltr">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 relative" dir="ltr">
                {onMinimize && (
                    <button
                        type="button"
                        onClick={onMinimize}
                        className="absolute top-4 right-4 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Minimize - continue in background"
                    >
                        <Minimize2 className="h-5 w-5" />
                    </button>
                )}
                <div className="flex flex-col items-center space-y-4">
                    <CircularProgress 
                        progress={clampedProgress} 
                        size={80} 
                        strokeWidth={6}
                        showPercentage={true}
                    />
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {status}
                        </h3>
                        {subStatus && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {subStatus}
                            </p>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${clampedProgress}%` }}
                        ></div>
                    </div>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="mt-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

