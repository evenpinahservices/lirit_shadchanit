"use client";

import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Pencil, Check } from "lucide-react";
import { Client } from "@/lib/mockData";
import { ProfileExport, ProfileFieldKey, ProfileOverride } from "./ProfileExport";
import { getBrand } from "@/config/branding";
import { detectClientLanguage } from "@/lib/utils";
import { FormLanguage } from "@/lib/translations";

interface ExportOverlayProps {
    clients: Client[];          // one or two profiles to export
    onClose: () => void;
}

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
    .export-overlay-chrome, .no-print { display: none !important; }
}
`;

export function ExportOverlay({ clients, onClose }: ExportOverlayProps) {
    const [index, setIndex] = useState(0);
    const [editMode, setEditMode] = useState(false);
    // Per-client field overrides. "" indicates "remove this row".
    const [overrides, setOverrides] = useState<Record<string, ProfileOverride>>({});

    const current = clients[index];
    const lang: FormLanguage = (current?.formLanguage as FormLanguage) || (current ? detectClientLanguage(current) : "en") || "en";
    const isRtl = lang === "he";
    const brand = getBrand();
    const hasMultiple = clients.length > 1;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (!current) return null;

    const currentOverride = overrides[current.id];

    const handleChange = (field: ProfileFieldKey, value: string) => {
        setOverrides(prev => ({
            ...prev,
            [current.id]: { ...prev[current.id], [field]: value },
        }));
    };
    const handleRemove = (field: ProfileFieldKey) => {
        setOverrides(prev => ({
            ...prev,
            [current.id]: { ...prev[current.id], [field]: "" },
        }));
    };

    return (
        <div className="fixed inset-0 z-100 flex flex-col bg-gray-100 dark:bg-gray-900 export-overlay-print" dir={isRtl ? "rtl" : "ltr"}>
            <style>{PRINT_CSS}</style>

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

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditMode(m => !m)}
                        className={
                            editMode
                                ? "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm bg-amber-500 text-white hover:bg-amber-600"
                                : "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm bg-white border text-gray-700 hover:bg-gray-50"
                        }
                        title={editMode ? (isRtl ? "סיים עריכה" : "Done editing") : (isRtl ? "ערוך" : "Edit")}
                    >
                        {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        {editMode ? (isRtl ? "סיים" : "Done") : (isRtl ? "ערוך" : "Edit")}
                    </button>
                    <button
                        onClick={() => window.print()}
                        disabled={editMode}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: brand.themeColor }}
                        title={editMode ? (isRtl ? "סיים עריכה לפני הורדה" : "Finish editing before downloading") : undefined}
                    >
                        <Download className="h-4 w-4" />
                        {isRtl ? "הורד PDF" : "Download PDF"}
                    </button>
                </div>
            </div>

            {editMode && (
                <div className="export-overlay-chrome shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
                    {isRtl
                        ? "מצב עריכה: לחץ על טקסט כדי לערוך, ✕ כדי למחוק שורה. השינויים זמניים — ההורדה תשקף אותם, הפרופיל המקורי לא ישתנה."
                        : "Edit mode: click any text to edit, click ✕ to remove a row. Changes are temporary — the download reflects them, the underlying profile is not modified."}
                </div>
            )}

            <div className="flex-1 overflow-y-auto py-6">
                <ProfileExport
                    key={current.id}
                    client={current}
                    editMode={editMode}
                    override={currentOverride}
                    onChange={handleChange}
                    onRemove={handleRemove}
                />
            </div>
        </div>
    );
}
