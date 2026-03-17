"use client";

import React from "react";
import { X, AlertCircle } from "lucide-react";
import type { FriendlyError } from "@/lib/errorMessages";

interface ErrorAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    error: FriendlyError | null;
}

/**
 * In-app error modal. Use instead of alert() so users see a clear,
 * friendly message and optional suggestion instead of raw server/network errors.
 */
export function ErrorAlertModal({
    isOpen,
    onClose,
    error,
}: ErrorAlertModalProps) {
    if (!isOpen || !error) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-xl max-w-md w-full border border-danger-200 dark:border-danger-800/50 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-danger-100 text-danger-600 dark:bg-danger-900/40 dark:text-danger-400">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {error.title}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {error.message}
                            </p>
                            {error.suggestion && (
                                <p className="mt-3 text-sm text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                                    {error.suggestion}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end border-t border-gray-100 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
