"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useClients } from "@/context/ClientContext";
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
function normalizeText(value: string | undefined, lang: FormLanguage): string {
    if (!value) return "";
    if (lang !== "he") return value;
    let out = value;
    for (const [pattern, replacement] of HEBREW_LABEL_FIXES) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

function Row({ label, value, isRtl }: { label: string; value: string; isRtl: boolean }) {
    if (value === "—") return null;
    const valueDir = getTextDirection(value);
    return (
        <div className={cn("flex gap-3 py-1.5 border-b border-gray-100 text-sm", isRtl && "flex-row-reverse")}>
            <span className="font-semibold text-gray-700 min-w-[140px]">{label}</span>
            <span className="text-gray-900 flex-1" dir={valueDir}>{value}</span>
        </div>
    );
}

export default function ExportProfilePage() {
    const params = useParams<{ clientId: string }>();
    const searchParams = useSearchParams();
    const auto = searchParams.get("auto") === "1";
    const { clients, isLoading } = useClients();
    const brand = getBrand();
    const client = clients.find(c => c.id === params.clientId);

    useEffect(() => {
        if (!auto || !client) return;
        // Give the page a tick to lay out and load logo before opening the print dialog
        const t = setTimeout(() => window.print(), 600);
        return () => clearTimeout(t);
    }, [auto, client]);

    if (isLoading) {
        return <div className="p-12 text-center text-gray-500">Loading profile…</div>;
    }
    if (!client) {
        return <div className="p-12 text-center text-gray-500">Profile not found.</div>;
    }

    const lang: FormLanguage = (client.formLanguage as FormLanguage) || detectClientLanguage(client) || "en";
    const isRtl = lang === "he";
    const age = calculateAge(client.dob);
    const ageDisplay = isNaN(age) ? "—" : (lang === "he" ? `${age} שנה` : `${age} y/o`);

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 14mm 16mm; }
                    body { background: white !important; }
                    .no-print { display: none !important; }
                }
                .watermark {
                    position: fixed;
                    bottom: 12mm;
                    ${isRtl ? "left: 16mm;" : "right: 16mm;"}
                    opacity: 0.15;
                    pointer-events: none;
                }
            `}</style>

            <div className="no-print fixed top-3 left-3 right-3 z-50 flex justify-center">
                <button
                    onClick={() => window.print()}
                    className="px-5 py-2 rounded-md text-white text-sm font-semibold shadow-md"
                    style={{ backgroundColor: brand.themeColor }}
                >
                    {lang === "he" ? "הורד PDF" : "Download PDF"}
                </button>
            </div>

            <div
                className="max-w-[210mm] mx-auto bg-white p-10 print:p-0"
                dir={isRtl ? "rtl" : "ltr"}
                style={{ fontFamily: isRtl ? `"Rubik", "Heebo", system-ui, sans-serif` : `system-ui, sans-serif` }}
            >
                {/* Header */}
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

                {/* Profile */}
                <section className="mb-5">
                    <Row label={t(lang, "labels.age")} value={ageDisplay} isRtl={isRtl} />
                    <Row label={t(lang, "labels.location")} value={formatValue(client.location, lang)} isRtl={isRtl} />
                    <Row label={t(lang, "labels.religiousAffiliation")} value={formatValue(client.religiousAffiliation, lang, "religiousAffiliation")} isRtl={isRtl} />
                    <Row label={t(lang, "labels.learningStatus")} value={formatValue(client.learningStatus, lang, "learningStatus")} isRtl={isRtl} />
                    <Row label={t(lang, "labels.occupationTitle")} value={formatValue(client.occupationTitle, lang)} isRtl={isRtl} />
                    {client.occupationDescription && (
                        <Row label={t(lang, "labels.occupationDescription")} value={normalizeText(client.occupationDescription, lang)} isRtl={isRtl} />
                    )}
                    <Row label={t(lang, "labels.familyBackground")} value={normalizeText(client.familyBackground, lang) || "—"} isRtl={isRtl} />
                    <Row label={t(lang, "labels.personality")} value={normalizeText(client.personality, lang) || "—"} isRtl={isRtl} />
                    <Row label={t(lang, "labels.hobbies")} value={normalizeText(client.hobbies, lang) || "—"} isRtl={isRtl} />
                </section>

                {/* What they're looking for */}
                <section className="mb-5">
                    <h2 className="text-base font-bold mb-2 pb-1 border-b" style={{ color: brand.themeColor, borderColor: brand.themeColor }}>
                        {t(lang, "steps.preferences")}
                    </h2>
                    {client.preferencesFreeText && (
                        <Row label={t(lang, "labels.preferencesFreeText")} value={normalizeText(client.preferencesFreeText, lang)} isRtl={isRtl} />
                    )}
                    <Row label={t(lang, "labels.preferredHashkafos")} value={formatValue(client.preferredHashkafos, lang, "religiousAffiliation")} isRtl={isRtl} />
                    <Row label={t(lang, "labels.preferredLearningStatus")} value={formatValue(client.preferredLearningStatus, lang, "learningStatus")} isRtl={isRtl} />
                    <Row label={t(lang, "labels.ageGapPreference")} value={formatValue(client.ageGapPreference, lang)} isRtl={isRtl} />
                </section>

                {/* Watermark logo */}
                {brand.logoNavbar && (
                    <div className="watermark">
                        <Image src={brand.logoNavbar} alt="" width={80} height={80} className="object-contain" />
                    </div>
                )}

                <footer className="mt-8 pt-3 border-t text-[10px] text-gray-400 text-center" style={{ borderColor: brand.themeColor }}>
                    {brand.shortName} · {new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-US")}
                </footer>
            </div>
        </>
    );
}
