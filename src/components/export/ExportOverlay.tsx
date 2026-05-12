"use client";

import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Client } from "@/lib/mockData";
import { ProfileExport } from "./ProfileExport";
import { getBrand } from "@/config/branding";
import { detectClientLanguage } from "@/lib/utils";
import { FormLanguage } from "@/lib/translations";

interface ExportOverlayProps {
    clients: Client[];          // one or two profiles to export
    onClose: () => void;
}

// Global CSS injected only while the overlay is mounted. Hides the rest of
// the page when printing so only the visible profile lands in the PDF, and
// also overrides the app's height/overflow constraints.
const PRINT_CSS = `
@media print {
    @page { size: A4; margin: 14mm 16mm; }
    html, body { background: white !important; height: auto !important; overflow: visible !important; }
    body * { visibility: hidden !important; }
    .export-overlay-print, .export-overlay-print * { visibility: visible !important; }
    .export-overlay-print {
        position: absolute !important;
        inset: 0 !important;
        background: white !important;
        padding: 0 !important;
        height: auto !important;
        overflow: visible !important;
    }
    .export-overlay-chrome { display: none !important; }
}
`;

export function ExportOverlay({ clients, onClose }: ExportOverlayProps) {
    const [index, setIndex] = useState(0);
    const current = clients[index];
    const lang: FormLanguage = (current?.formLanguage as FormLanguage) || (current ? detectClientLanguage(current) : "en") || "en";
    const isRtl = lang === "he";
    const brand = getBrand();
    const hasMultiple = clients.length > 1;

    // Close on Escape; lock body scroll while overlay is open
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    if (!current) return null;

    return (
        <div className="fixed inset-0 z-100 flex flex-col bg-gray-100 dark:bg-gray-900 export-overlay-print" dir={isRtl ? "rtl" : "ltr"}>
            <style>{PRINT_CSS}</style>

            {/* Top action bar — hidden in print */}
            <div className="export-overlay-chrome shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b bg-white dark:bg-gray-950 shadow-sm">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                    <X className="h-4 w-4" />
                    {isRtl ? "סגור" : "Close"}
                </button>

                {hasMultiple && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        {/* Arrows point in the direction of travel so they read correctly
                            in both LTR and RTL — in Hebrew, "previous" goes right. */}
                        <button
                            onClick={() => setIndex(i => Math.max(0, i - 1))}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            aria-label={isRtl ? "הקודם" : "Previous"}
                        >
                            {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                        <span className="font-medium">
                            {isRtl
                                ? `פרופיל ${index + 1} מתוך ${clients.length}`
                                : `Profile ${index + 1} of ${clients.length}`}
                        </span>
                        <button
                            onClick={() => setIndex(i => Math.min(clients.length - 1, i + 1))}
                            disabled={index >= clients.length - 1}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            aria-label={isRtl ? "הבא" : "Next"}
                        >
                            {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                )}

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-white text-sm font-semibold shadow-sm hover:opacity-90"
                    style={{ backgroundColor: brand.themeColor }}
                >
                    <Download className="h-4 w-4" />
                    {isRtl ? "הורד PDF" : "Download PDF"}
                </button>
            </div>

            {/* Scrollable profile content */}
            <div className="flex-1 overflow-y-auto py-6">
                <ProfileExport client={current} />
            </div>
        </div>
    );
}
