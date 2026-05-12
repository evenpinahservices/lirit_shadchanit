"use client";

import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Pencil, Check, Undo2, Redo2, XCircle } from "lucide-react";
import { Client } from "@/lib/mockData";
import { ProfileExport, ProfileFieldKey, ProfileOverride } from "./ProfileExport";
import { getBrand } from "@/config/branding";
import { detectClientLanguage } from "@/lib/utils";
import { FormLanguage } from "@/lib/translations";

interface ExportOverlayProps {
    clients: Client[];          // one or two profiles to export
    onClose: () => void;
}

type OverrideMap = Record<string, ProfileOverride>;

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
    const [overrides, setOverrides] = useState<OverrideMap>({});

    // Undo/redo stack. Each entry is a full snapshot of overrides. The first
    // entry is the snapshot taken when edit mode was entered, used by Cancel.
    const [history, setHistory] = useState<OverrideMap[]>([{}]);
    const [historyIndex, setHistoryIndex] = useState(0);

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
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Push a new overrides snapshot onto the undo stack and make it current.
    const pushHistory = (next: OverrideMap) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
        setHistoryIndex(historyIndex + 1);
        setOverrides(next);
    };

    const handleChange = (field: ProfileFieldKey, value: string) => {
        const next: OverrideMap = {
            ...overrides,
            [current.id]: { ...overrides[current.id], [field]: value },
        };
        pushHistory(next);
    };
    const handleRemove = (field: ProfileFieldKey) => {
        const next: OverrideMap = {
            ...overrides,
            [current.id]: { ...overrides[current.id], [field]: "" },
        };
        pushHistory(next);
    };
    const handleRestore = (field: ProfileFieldKey) => {
        const nextClient = { ...overrides[current.id] };
        delete nextClient[field];
        const next: OverrideMap = { ...overrides, [current.id]: nextClient };
        pushHistory(next);
    };

    const handleUndo = () => {
        if (!canUndo) return;
        const i = historyIndex - 1;
        setHistoryIndex(i);
        setOverrides(history[i]);
    };
    const handleRedo = () => {
        if (!canRedo) return;
        const i = historyIndex + 1;
        setHistoryIndex(i);
        setOverrides(history[i]);
    };

    const enterEditMode = () => {
        // Snapshot current state as the baseline for Cancel/Undo back to start.
        setHistory([overrides]);
        setHistoryIndex(0);
        setEditMode(true);
    };
    const doneEditing = () => {
        setEditMode(false);
    };
    const cancelEditing = () => {
        // Restore the snapshot taken when edit mode was entered.
        const baseline = history[0] ?? {};
        setOverrides(baseline);
        setHistory([baseline]);
        setHistoryIndex(0);
        setEditMode(false);
    };

    // Keyboard shortcuts in edit mode: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or
    // Ctrl/Cmd+Y = redo. Avoid hijacking when the user is typing into a
    // contentEditable (the browser already handles plain undo there).
    useEffect(() => {
        if (!editMode) return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.isContentEditable) return;
            const meta = e.ctrlKey || e.metaKey;
            if (!meta) return;
            const key = e.key.toLowerCase();
            if (key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
            else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); handleRedo(); }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    });

    return (
        <div className="fixed inset-0 z-100 flex flex-col bg-gray-100 dark:bg-gray-900 export-overlay-print" dir={isRtl ? "rtl" : "ltr"}>
            <style>{PRINT_CSS}</style>

            <div className="export-overlay-chrome shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b bg-white dark:bg-gray-950 shadow-sm flex-wrap">
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
                    {editMode && (
                        <>
                            <button
                                onClick={handleUndo}
                                disabled={!canUndo}
                                className="p-1.5 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isRtl ? "בטל (Ctrl+Z)" : "Undo (Ctrl+Z)"}
                                aria-label={isRtl ? "בטל" : "Undo"}
                            >
                                <Undo2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={!canRedo}
                                className="p-1.5 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isRtl ? "בצע שוב (Ctrl+Y)" : "Redo (Ctrl+Y)"}
                                aria-label={isRtl ? "בצע שוב" : "Redo"}
                            >
                                <Redo2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                title={isRtl ? "בטל את כל השינויים" : "Discard all changes"}
                            >
                                <XCircle className="h-4 w-4" />
                                {isRtl ? "בטל" : "Cancel"}
                            </button>
                        </>
                    )}
                    {editMode ? (
                        <button
                            onClick={doneEditing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm bg-amber-500 text-white hover:bg-amber-600"
                            title={isRtl ? "סיים עריכה" : "Done editing"}
                        >
                            <Check className="h-4 w-4" />
                            {isRtl ? "סיים" : "Done"}
                        </button>
                    ) : (
                        <button
                            onClick={enterEditMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm bg-white border text-gray-700 hover:bg-gray-50"
                            title={isRtl ? "ערוך" : "Edit"}
                        >
                            <Pencil className="h-4 w-4" />
                            {isRtl ? "ערוך" : "Edit"}
                        </button>
                    )}
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
                        ? "מצב עריכה: לחץ על טקסט כדי לערוך, ✕ כדי למחוק שורה. ניתן לבטל/לבצע שוב פעולות, או לבטל את כולן. השינויים זמניים — הפרופיל המקורי לא ישתנה."
                        : "Edit mode: click any text to edit, click ✕ to remove a row. Use Undo / Redo to step back and forth, Cancel to discard everything. Changes are temporary — the underlying profile is not modified."}
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
                    onRestore={handleRestore}
                />
            </div>
        </div>
    );
}
