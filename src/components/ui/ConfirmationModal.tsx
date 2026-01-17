
import React from "react";
import { X, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false,
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "bg-white dark:bg-gray-950 rounded-lg shadow-xl max-w-md w-full border animate-in zoom-in-95 duration-200 overflow-hidden",
                isDangerous 
                    ? "border-red-300 dark:border-red-800 shadow-red-500/20" 
                    : "border-gray-200 dark:border-gray-800"
            )}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                            isDangerous 
                                ? "bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300" 
                                : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        )}>
                            {isDangerous ? (
                                <AlertCircle className="h-6 w-6" />
                            ) : (
                                <AlertTriangle className="h-5 w-5" />
                            )}
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className={cn(
                                "text-lg font-semibold",
                                isDangerous 
                                    ? "text-red-900 dark:text-red-100" 
                                    : "text-gray-900 dark:text-gray-100"
                            )}>
                                {title}
                            </h3>
                            <p className={cn(
                                "mt-2 text-sm",
                                isDangerous 
                                    ? "text-red-700 dark:text-red-300 font-medium" 
                                    : "text-gray-500 dark:text-gray-400"
                            )}>
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none transition-colors",
                            isDangerous
                                ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
