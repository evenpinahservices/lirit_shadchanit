"use client";

import Image from "next/image";
import { Client } from "@/lib/mockData";
import { detectClientLanguage, getTextDirection, cn } from "@/lib/utils";
import { t, valueToLabel, FormLanguage } from "@/lib/translations";
import { calculateAge } from "@/lib/matchingUtils";
import { getBrand } from "@/config/branding";

type OptionKey = keyof typeof import("@/lib/translations").translations.en.options;

// Field IDs used for the optional override map in edit mode. Keys match
// Client fields where possible; computed/header fields get their own keys.
export type ProfileFieldKey =
    | "fullName"
    | "ageDisplay"
    | "headerLocation"
    | "religiousAffiliation"
    | "occupationTitle"
    | "occupationDescription"
    | "familyBackground"
    | "personality"
    | "hobbies"
    | "learningStatus"
    | "preferencesFreeText";

export type ProfileOverride = Partial<Record<ProfileFieldKey, string>>;

export interface ProfileExportProps {
    client: Client;
    editMode?: boolean;
    override?: ProfileOverride;
    onChange?: (field: ProfileFieldKey, value: string) => void;
    onRemove?: (field: ProfileFieldKey) => void;
    /** Clear an override entry so the original value is shown again. */
    onRestore?: (field: ProfileFieldKey) => void;
}

function formatValue(
    value: string | string[] | boolean | number | undefined,
    lang: FormLanguage,
    optionKey?: OptionKey,
): string {
    if (value === undefined || value === null || value === "") return "—";
    if (Array.isArray(value)) {
        if (value.length === 0) return "—";
        return optionKey
            ? value.map(v => valueToLabel(lang, optionKey, String(v))).join(", ")
            : value.join(", ");
    }
    if (typeof value === "boolean") return value ? (lang === "he" ? "כן" : "Yes") : (lang === "he" ? "לא" : "No");
    if (typeof value === "number") return value.toString();
    return optionKey ? valueToLabel(lang, optionKey, value) : value;
}

const HEBREW_LABEL_FIXES: Array<[RegExp, string]> = [
    [/\bFather\s*:/gi, "אבא:"],
    [/\bMother\s*:/gi, "אמא:"],
    [/\bSiblings\s*:/gi, "אחים ואחיות:"],
    [/\bBrothers?\s*:/gi, "אחים:"],
    [/\bSisters?\s*:/gi, "אחיות:"],
    [/\bParents?\s*:/gi, "הורים:"],
    [/\bFamily\s*:/gi, "משפחה:"],
];

function dedupeRestatement(value: string): string {
    const markers = [/אבא/g, /אמא/g, /\bFather\b/gi, /\bMother\b/gi];
    let earliestSecond = Infinity;
    for (const re of markers) {
        const matches = [...value.matchAll(re)];
        if (matches.length >= 2 && matches[1].index !== undefined) {
            earliestSecond = Math.min(earliestSecond, matches[1].index);
        }
    }
    if (earliestSecond === Infinity) return value;
    if (earliestSecond < 40) return value;
    return value.slice(0, earliestSecond).replace(/[\s,;–\-—]+$/, "").trim();
}

function normalizeText(value: string | undefined, lang: FormLanguage): string {
    if (!value) return "";
    let out = dedupeRestatement(value);
    if (lang === "he") {
        for (const [pattern, replacement] of HEBREW_LABEL_FIXES) {
            out = out.replace(pattern, replacement);
        }
    }
    return out;
}

function Editable({
    text,
    editMode,
    onCommit,
    className,
    dir,
}: {
    text: string;
    editMode: boolean;
    onCommit: (next: string) => void;
    className?: string;
    dir?: "rtl" | "ltr";
}) {
    if (!editMode) {
        return <span className={className} dir={dir}>{text}</span>;
    }
    return (
        <span
            className={cn(className, "outline-none focus:ring-2 focus:ring-green-400 rounded px-0.5 cursor-text")}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            dir={dir}
            onBlur={e => onCommit(e.currentTarget.textContent?.trim() ?? "")}
            // Stop print-page propagation oddities
            onKeyDown={e => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLElement).blur();
                }
            }}
        >
            {text}
        </span>
    );
}

function Row({
    label,
    value,
    isRtl,
    editMode,
    isRemoved,
    fieldKey,
    onChange,
    onRemove,
    onRestore,
}: {
    label: string;
    value: string;
    isRtl: boolean;
    editMode?: boolean;
    isRemoved?: boolean;
    fieldKey: ProfileFieldKey;
    onChange?: (field: ProfileFieldKey, value: string) => void;
    onRemove?: (field: ProfileFieldKey) => void;
    onRestore?: (field: ProfileFieldKey) => void;
}) {
    // When removed: in view mode skip entirely. In edit mode show a faded
    // placeholder with a "+ restore" button so the admin can bring it back.
    if (isRemoved && !editMode) return null;
    if (isRemoved && editMode) {
        return (
            <div
                className="no-print flex gap-3 py-1.5 border-b border-dashed border-gray-200 text-xs text-gray-400 italic"
                dir={isRtl ? "rtl" : "ltr"}
            >
                <span className={cn("min-w-[160px]", isRtl ? "text-right" : "text-left")}>{label}</span>
                <button
                    type="button"
                    onClick={() => onRestore?.(fieldKey)}
                    className="text-green-600 hover:text-green-700 underline"
                >
                    {isRtl ? "+ החזר שורה" : "+ Restore row"}
                </button>
            </div>
        );
    }

    if (value === "—") return null;
    const valueDir = getTextDirection(value);
    return (
        <div
            className="flex gap-3 py-1.5 border-b border-gray-100 text-sm group relative"
            dir={isRtl ? "rtl" : "ltr"}
            key={`${fieldKey}-${editMode ? "edit" : "view"}`}
        >
            <span className={cn("font-semibold text-gray-700 min-w-[160px]", isRtl ? "text-right" : "text-left")}>
                {label}
            </span>
            <Editable
                text={value}
                editMode={!!editMode}
                onCommit={next => onChange?.(fieldKey, next)}
                className={cn("text-gray-900 flex-1", isRtl ? "text-right" : "text-left")}
                dir={valueDir}
            />
            {editMode && (
                <button
                    type="button"
                    onClick={() => onRemove?.(fieldKey)}
                    className={cn(
                        "no-print shrink-0 text-gray-400 hover:text-red-600 text-sm px-1",
                        "opacity-60 hover:opacity-100",
                    )}
                    aria-label="Remove row"
                    title="Remove"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

export function ProfileExport({ client, editMode = false, override, onChange, onRemove, onRestore }: ProfileExportProps) {
    const brand = getBrand();
    const lang: FormLanguage = (client.formLanguage as FormLanguage) || detectClientLanguage(client) || "en";
    const isRtl = lang === "he";
    const age = calculateAge(client.dob);
    const defaultAgeDisplay = isNaN(age) ? "—" : (lang === "he" ? `${age} שנה` : `${age} y/o`);

    // True when the admin removed this field (override holds "" sentinel).
    const isRemoved = (key: ProfileFieldKey): boolean => !!override && key in override && override[key] === "";

    // Display value with empty-string override resolving to "—" so view-mode
    // rows disappear completely. Edit-mode handles restoration separately.
    const getDisplay = (key: ProfileFieldKey, fallback: string): string => {
        if (override && key in override) {
            const v = override[key];
            if (v === "" || v == null) return "—";
            return v;
        }
        return fallback || "—";
    };

    const displayName = getDisplay("fullName", client.fullName);
    const displayAge = getDisplay("ageDisplay", defaultAgeDisplay);
    const displayLocation = getDisplay("headerLocation", client.location);
    const displayHashkafa = getDisplay("religiousAffiliation", formatValue(client.religiousAffiliation, lang, "religiousAffiliation"));
    const displayOccupationTitle = getDisplay("occupationTitle", formatValue(client.occupationTitle, lang));
    const displayOccupationDescription = getDisplay("occupationDescription", normalizeText(client.occupationDescription, lang));
    const displayFamily = getDisplay("familyBackground", normalizeText(client.familyBackground, lang));
    const displayPersonality = getDisplay("personality", normalizeText(client.personality, lang));
    const displayHobbies = getDisplay("hobbies", normalizeText(client.hobbies, lang));
    const displayLearning = getDisplay("learningStatus", formatValue(client.learningStatus, lang, "learningStatus"));
    const displayPrefs = getDisplay("preferencesFreeText", normalizeText(client.preferencesFreeText, lang));

    const ageRemoved = isRemoved("ageDisplay");
    const locationRemoved = isRemoved("headerLocation");
    // Show separator dot only when both age and location are actually displayed
    const showDot = !ageRemoved && !locationRemoved && displayAge !== "—" && displayLocation !== "—";

    return (
        <div
            className="profile-export max-w-[210mm] mx-auto bg-white p-10 print:p-0"
            dir={isRtl ? "rtl" : "ltr"}
            style={{ fontFamily: isRtl ? `"Rubik", "Heebo", system-ui, sans-serif` : `system-ui, sans-serif` }}
        >
            <header className={cn("flex items-center gap-4 border-b-2 pb-4 mb-6", isRtl && "flex-row-reverse")} style={{ borderColor: brand.themeColor }}>
                {brand.logoNavbar && (
                    <Image src={brand.logoNavbar} alt={brand.shortName} width={56} height={56} className="object-contain" />
                )}
                <div className={cn("flex-1", isRtl ? "text-right" : "text-left")}>
                    {displayName !== "—" && (
                        <h1
                            key={`name-${editMode ? "edit" : "view"}`}
                            className="text-2xl font-bold text-gray-900 inline-block"
                            dir={getTextDirection(displayName)}
                        >
                            <Editable
                                text={displayName}
                                editMode={editMode}
                                onCommit={v => onChange?.("fullName", v)}
                                dir={getTextDirection(displayName)}
                            />
                        </h1>
                    )}
                    <p className="text-sm text-gray-500 mt-0.5">
                        {displayAge !== "—" && (
                            <Editable
                                text={displayAge}
                                editMode={editMode}
                                onCommit={v => onChange?.("ageDisplay", v)}
                            />
                        )}
                        {showDot && " · "}
                        {displayLocation !== "—" && (
                            <Editable
                                text={displayLocation}
                                editMode={editMode}
                                onCommit={v => onChange?.("headerLocation", v)}
                                dir={getTextDirection(displayLocation)}
                            />
                        )}
                        {editMode && (
                            <span className="no-print">
                                {displayAge !== "—" ? (
                                    <button
                                        type="button"
                                        onClick={() => onRemove?.("ageDisplay")}
                                        className="ml-2 text-gray-400 hover:text-red-600"
                                        aria-label="Remove age"
                                        title="Remove age"
                                    >
                                        ✕ age
                                    </button>
                                ) : ageRemoved && (
                                    <button
                                        type="button"
                                        onClick={() => onRestore?.("ageDisplay")}
                                        className="ml-2 text-green-600 hover:text-green-700 underline"
                                    >
                                        + add age
                                    </button>
                                )}
                                {displayLocation !== "—" ? (
                                    <button
                                        type="button"
                                        onClick={() => onRemove?.("headerLocation")}
                                        className="ml-2 text-gray-400 hover:text-red-600"
                                        aria-label="Remove location"
                                        title="Remove location"
                                    >
                                        ✕ location
                                    </button>
                                ) : locationRemoved && (
                                    <button
                                        type="button"
                                        onClick={() => onRestore?.("headerLocation")}
                                        className="ml-2 text-green-600 hover:text-green-700 underline"
                                    >
                                        + add location
                                    </button>
                                )}
                            </span>
                        )}
                    </p>
                </div>
            </header>

            <section className="mb-5">
                <Row label={t(lang, "labels.religiousAffiliation")} value={displayHashkafa} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("religiousAffiliation")} fieldKey="religiousAffiliation"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                <Row label={t(lang, "labels.occupationTitle")} value={displayOccupationTitle} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("occupationTitle")} fieldKey="occupationTitle"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                <Row label={t(lang, "labels.occupationDescription")} value={displayOccupationDescription} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("occupationDescription")} fieldKey="occupationDescription"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                <Row label={t(lang, "labels.familyBackground")} value={displayFamily} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("familyBackground")} fieldKey="familyBackground"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                <Row label={t(lang, "labels.personality")} value={displayPersonality} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("personality")} fieldKey="personality"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                <Row label={t(lang, "labels.hobbies")} value={displayHobbies} isRtl={isRtl}
                    editMode={editMode} isRemoved={isRemoved("hobbies")} fieldKey="hobbies"
                    onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                {client.gender === "Male" && (
                    <Row label={lang === "he" ? "סטטוס לימוד" : "Learning Status"} value={displayLearning} isRtl={isRtl}
                        editMode={editMode} isRemoved={isRemoved("learningStatus")} fieldKey="learningStatus"
                        onChange={onChange} onRemove={onRemove} onRestore={onRestore} />
                )}
            </section>

            {displayPrefs !== "—" ? (
                <section className="mb-5 group relative">
                    <h2 className="text-base font-bold mb-2 pb-1 border-b" style={{ color: brand.themeColor, borderColor: brand.themeColor }}>
                        {lang === "he" ? "מה מחפש?" : "What are you looking for?"}
                    </h2>
                    <p
                        key={`prefs-${editMode ? "edit" : "view"}`}
                        className={cn("text-sm text-gray-900 py-1.5", isRtl ? "text-right" : "text-left")}
                        dir={getTextDirection(displayPrefs)}
                    >
                        <Editable
                            text={displayPrefs}
                            editMode={editMode}
                            onCommit={v => onChange?.("preferencesFreeText", v)}
                            dir={getTextDirection(displayPrefs)}
                        />
                    </p>
                    {editMode && (
                        <button
                            type="button"
                            onClick={() => onRemove?.("preferencesFreeText")}
                            className="no-print absolute top-2 right-2 text-gray-400 hover:text-red-600 text-sm"
                            aria-label="Remove section"
                            title="Remove"
                        >
                            ✕
                        </button>
                    )}
                </section>
            ) : editMode && isRemoved("preferencesFreeText") ? (
                <div className="no-print mb-5 py-2 px-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs text-gray-500 italic flex items-center justify-between">
                    <span>{lang === "he" ? "מה מחפש (הוסר)" : "What are you looking for? (removed)"}</span>
                    <button
                        type="button"
                        onClick={() => onRestore?.("preferencesFreeText")}
                        className="text-green-600 hover:text-green-700 underline"
                    >
                        {lang === "he" ? "+ החזר סעיף" : "+ Restore section"}
                    </button>
                </div>
            ) : null}

            {brand.logoNavbar && (
                <div
                    className="profile-export-watermark"
                    style={{
                        position: "absolute",
                        bottom: "12mm",
                        [isRtl ? "left" : "right"]: "16mm",
                        opacity: 0.15,
                        pointerEvents: "none",
                    }}
                >
                    <Image src={brand.logoNavbar} alt="" width={80} height={80} className="object-contain" />
                </div>
            )}

            <footer className="mt-8 pt-3 border-t text-[10px] text-gray-400 text-center" style={{ borderColor: brand.themeColor }}>
                {brand.shortName} · {new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-US")}
            </footer>
        </div>
    );
}
