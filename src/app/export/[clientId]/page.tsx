"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { ProfileExport } from "@/components/export/ProfileExport";
import { getBrand } from "@/config/branding";
import { detectClientLanguage } from "@/lib/utils";
import { FormLanguage } from "@/lib/translations";

// Standalone /export/[clientId] route — kept so the page is shareable via URL
// (e.g. for direct linking). The overlay component handles the in-app flow.

export default function ExportProfilePage() {
    const params = useParams<{ clientId: string }>();
    const searchParams = useSearchParams();
    const auto = searchParams.get("auto") === "1";
    const { clients, isLoading } = useClients();
    const brand = getBrand();
    const client = clients.find(c => c.id === params.clientId);

    useEffect(() => {
        if (!auto || !client) return;
        const id = setTimeout(() => window.print(), 600);
        return () => clearTimeout(id);
    }, [auto, client]);

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading profile…</div>;
    if (!client) return <div className="p-12 text-center text-gray-500">Profile not found.</div>;

    const lang: FormLanguage = (client.formLanguage as FormLanguage) || detectClientLanguage(client) || "en";

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 14mm 16mm; }
                    html, body { background: white !important; height: auto !important; overflow: visible !important; }
                    body * { overflow: visible !important; }
                    body > div { height: auto !important; max-height: none !important; }
                    nav, #mobile-bottom-nav, .no-print { display: none !important; }
                    main { padding: 0 !important; }
                }
            `}</style>

            <button
                onClick={() => window.print()}
                className="no-print fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white text-sm font-semibold shadow-md hover:opacity-90"
                style={{ backgroundColor: brand.themeColor }}
            >
                {lang === "he" ? "הורד PDF" : "Download PDF"}
            </button>

            <ProfileExport client={client} />
        </>
    );
}
