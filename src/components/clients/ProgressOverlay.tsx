"use client";

import { Loader2 } from "lucide-react";

interface ProgressOverlayProps {
    isVisible: boolean;
    status: string;
    subStatus?: string;
}

export function ProgressOverlay({ isVisible, status, subStatus }: ProgressOverlayProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-75 flex items-center justify-center" dir="ltr">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4" dir="ltr">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

