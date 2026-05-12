"use client";

import Image from "next/image";
import { Client } from "@/lib/mockData";
import { detectClientLanguage, getTextDirection, cn } from "@/lib/utils";
import { t, valueToLabel, FormLanguage } from "@/lib/translations";
import { calculateAge } from "@/lib/matchingUtils";
import { getBrand } from "@/config/branding";

type OptionKey = keyof typeof import("@/lib/translations").translations.en.options;

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

// AI sometimes leaves English labels ("Father:", "Mother:", "Siblings:")
// embedded in otherwise-Hebrew free-text fields. Translate them inline so
// the exported PDF reads cleanly in one language.
const HEBREW_LABEL_FIXES: Array<[RegExp, string]> = [
    [/\bFather\s*:/gi, "אבא:"],
    [/\bMother\s*:/gi, "אמא:"],
    [/\bSiblings\s*:/gi, "אחים ואחיות:"],
    [/\bBrothers?\s*:/gi, "אחים:"],
    [/\bSisters?\s*:/gi, "אחיות:"],
    [/\bParents?\s*:/gi, "הורים:"],
    [/\bFamily\s*:/gi, "משפחה:"],
];
// AI extraction sometimes appends a condensed restatement of the same block
// — e.g. detailed Hebrew description followed by a structured "אבא: / אמא:"
// summary, or vice versa. Truncate at the start of the second mention of a
// family member so the PDF doesn't read like it's repeating itself.
// Markers are word-boundary based so "אבא אהרון :" and "אבא:" both count.
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
    // Don't chop too early — keep at least 40 chars of the original text
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

function Row({ label, value, isRtl }: { label: string; value: string; isRtl: boolean }) {
    if (value === "—") return null;
    const valueDir = getTextDirection(value);
    return (
        <div className="flex gap-3 py-1.5 border-b border-gray-100 text-sm" dir={isRtl ? "rtl" : "ltr"}>
            <span className={cn("font-semibold text-gray-700 min-w-[160px]", isRtl ? "text-right" : "text-left")}>
                {label}
            </span>
            <span className={cn("text-gray-900 flex-1", isRtl ? "text-right" : "text-left")} dir={valueDir}>
                {value}
            </span>
        </div>
    );
}

export function ProfileExport({ client }: { client: Client }) {
    const brand = getBrand();
    const lang: FormLanguage = (client.formLanguage as FormLanguage) || detectClientLanguage(client) || "en";
    const isRtl = lang === "he";
    const age = calculateAge(client.dob);
    const ageDisplay = isNaN(age) ? "—" : (lang === "he" ? `${age} שנה` : `${age} y/o`);

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
                    <h1 className="text-2xl font-bold text-gray-900" dir={getTextDirection(client.fullName)}>
                        {client.fullName}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {ageDisplay}
                        {client.location ? <> · <span dir={getTextDirection(client.location)}>{client.location}</span></> : null}
                    </p>
                </div>
            </header>

            <section className="mb-5">
                <Row label={t(lang, "labels.religiousAffiliation")} value={formatValue(client.religiousAffiliation, lang, "religiousAffiliation")} isRtl={isRtl} />
                <Row label={t(lang, "labels.occupationTitle")} value={formatValue(client.occupationTitle, lang)} isRtl={isRtl} />
                {client.occupationDescription && (
                    <Row label={t(lang, "labels.occupationDescription")} value={normalizeText(client.occupationDescription, lang)} isRtl={isRtl} />
                )}
                <Row label={t(lang, "labels.familyBackground")} value={normalizeText(client.familyBackground, lang) || "—"} isRtl={isRtl} />
                <Row label={t(lang, "labels.personality")} value={normalizeText(client.personality, lang) || "—"} isRtl={isRtl} />
                <Row label={t(lang, "labels.hobbies")} value={normalizeText(client.hobbies, lang) || "—"} isRtl={isRtl} />
                {client.gender === "Male" && (
                    <Row label={lang === "he" ? "סטטוס לימוד" : "Learning Status"} value={formatValue(client.learningStatus, lang, "learningStatus")} isRtl={isRtl} />
                )}
            </section>

            {client.preferencesFreeText && (
                <section className="mb-5">
                    <h2 className="text-base font-bold mb-2 pb-1 border-b" style={{ color: brand.themeColor, borderColor: brand.themeColor }}>
                        {lang === "he" ? "מה מחפש?" : "What are you looking for?"}
                    </h2>
                    <p className={cn("text-sm text-gray-900 py-1.5", isRtl ? "text-right" : "text-left")} dir={getTextDirection(client.preferencesFreeText)}>
                        {normalizeText(client.preferencesFreeText, lang)}
                    </p>
                </section>
            )}

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
