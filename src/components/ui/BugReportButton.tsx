"use client";

import { useState, useRef } from "react";
import { Bug, X, Send, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { submitBugReport } from "@/actions/bug";

export function BugReportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const pathname = usePathname();
    const { user } = useAuth();

    const captureScreenshot = async () => {
        setIsCapturing(true);
        const bugBtn = document.getElementById("bug-report-btn");

        try {
            // Hide the bug button temporarily
            if (bugBtn) bugBtn.style.display = "none";

            // Use html-to-image with cache busting to avoid CORS issues
            const dataUrl = await toPng(document.body, { cacheBust: true });

            setScreenshot(dataUrl);
            setIsOpen(true);
        } catch (error) {
            console.error("Failed to capture screenshot:", error);
            alert("Failed to capture screenshot. Please try again or check console for details.");
            setIsOpen(false);
        } finally {
            // Restore bug button
            if (bugBtn) bugBtn.style.display = "";
            setIsCapturing(false);
        }
    };

    const handleSubmit = async () => {
        if (!screenshot || !description.trim()) {
            alert("Please provide a description of the issue.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitBugReport({
                screenshotBase64: screenshot,
                description: description.trim(),
                metadata: {
                    timestamp: new Date().toISOString(),
                    pathname,
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                    },
                    screenResolution: {
                        width: screen.width,
                        height: screen.height,
                    },
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "Unknown",
                },
            });

            if (result.success) {
                setSubmitted(true);
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                alert("Failed to submit bug report: " + result.error);
            }
        } catch (error) {
            console.error("Error submitting bug report:", error);
            alert("Failed to submit bug report. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setScreenshot(null);
        setDescription("");
        setSubmitted(false);
    };

    return (
        <>
            {/* Bug Report Button */}
            <button
                id="bug-report-btn"
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="p-2 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50"
                title="Report a Bug"
            >
                {isCapturing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Bug className="h-5 w-5" />
                )}
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Bug className="h-5 w-5 text-orange-500" />
                                Report a Bug
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {submitted ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-green-600">Bug Report Submitted!</h3>
                                    <p className="text-sm text-gray-500 mt-1">Thank you for your feedback.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Screenshot Preview */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                            Screenshot
                                        </label>
                                        <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            {screenshot && (
                                                <img
                                                    src={screenshot}
                                                    alt="Screenshot"
                                                    className="w-full h-auto max-h-48 object-contain"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                            What went wrong?
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Describe the issue you encountered..."
                                            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:border-gray-700"
                                            rows={4}
                                        />
                                    </div>

                                    {/* Metadata Preview */}
                                    <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-1">
                                        <p><strong>Page:</strong> {pathname}</p>
                                        <p><strong>Viewport:</strong> {window.innerWidth}x{window.innerHeight}</p>
                                        <p><strong>User:</strong> {user?.name || "Unknown"}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {!submitted && (
                            <div className="p-4 border-t flex justify-end gap-2">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !description.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Submit Report
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
