"use client";

import { CircularProgress } from "@/components/ui/CircularProgress";

interface ProgressOverlayProps {
    isVisible: boolean;
    status: string;
    subStatus?: string;
    progress?: number; // 0-100
}

export function ProgressOverlay({ isVisible, status, subStatus, progress = 0 }: ProgressOverlayProps) {
    if (!isVisible) return null;

    // Ensure progress is between 0 and 100
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-75 flex items-center justify-center" dir="ltr">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4" dir="ltr">
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
                </div>
            </div>
        </div>
    );
}

