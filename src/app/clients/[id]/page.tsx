"use client";

import { ClientForm } from "@/components/clients/ClientForm";
import { ClientProfileView } from "@/components/clients/ClientProfileView";
import { useClients } from "@/context/ClientContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Client } from "@/lib/mockData";
import { detectClientLanguage } from "@/lib/utils";

function ClientDetailsContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const source = searchParams.get("source");
    const { getClient, deleteClient } = useClients();
    const [client, setClient] = useState<Client | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    // Initialize view mode based on query param
    const [isViewMode, setIsViewMode] = useState(searchParams.get("mode") !== "edit");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (params.id) {
            const foundClient = getClient(params.id as string);
            if (foundClient) {
                setClient(foundClient);
            } else {
                router.push("/clients");
            }
            setLoading(false);
        }
    }, [params.id, getClient, router, isViewMode]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading client details...</p>
                </div>
            </div>
        );
    }
    if (!client) return null;

    const handleDelete = () => {
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (client) {
            deleteClient(client.id);
            router.push("/clients");
        }
    };

    // Detect language early so it can be used in both view and edit modes
    const clientLang = detectClientLanguage(client);
    // Force RTL for profile view (always read from right to left)
    const isRtl = true;

    const getBackInfo = () => {
        switch (source) {
            case "matching":
                return { 
                    text: isRtl ? "חזרה להתאמות" : "Back to Matching", 
                    link: "/matching" 
                };
            case "search":
                return { 
                    text: isRtl ? "חזרה לחיפוש" : "Back to Search", 
                    link: "/search" 
                };
            default:
                return { 
                    text: isRtl ? "חזרה ללקוחות" : "Back to Clients", 
                    link: "/clients" 
                };
        }
    };

    const { text: backText, link: backLink } = getBackInfo();

    if (isViewMode) {
        return (
            <div className={`w-full max-w-4xl mx-auto h-[calc(100dvh-8rem)] flex flex-col space-y-2 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
                <button
                    onClick={() => router.push(backLink)}
                    className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 shrink-0"
                >
                    {isRtl ? `${backText} →` : `← ${backText}`}
                </button>
                <div className="w-full flex-1 min-h-0">
                    <ClientProfileView
                        client={client}
                        onEdit={() => setIsViewMode(false)}
                        onDelete={handleDelete}
                    />
                </div>
                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title={isRtl ? "מחיקת לקוח" : "Delete Client"}
                    message={isRtl ? "האם אתה בטוח שברצונך למחוק לקוח זה? פעולה זו אינה ניתנת לביטול." : "Are you sure you want to delete this client? This action cannot be undone."}
                    confirmText={isRtl ? "מחק" : "Delete"}
                    isDangerous={true}
                />
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex flex-col flex-1 min-h-0 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className="shrink-0 mb-2">
                <button
                    onClick={() => setIsViewMode(true)}
                    className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 mb-2"
                >
                    {isRtl ? "חזרה לפרופיל →" : "← Back to Profile"}
                </button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isRtl ? "עריכת לקוח" : "Edit Client"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isRtl ? "עדכן את פרטי הפרופיל של הלקוח." : "Update the client profile details."}
                    </p>
                </div>
            </div>
            <ClientForm
                key={`${client.id}-${clientLang}`}
                client={client}
                isEditing
                onCancel={() => setIsViewMode(true)}
                language={clientLang}
            />
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Client"
                message="Are you sure you want to delete this client? This action cannot be undone."
                confirmText="Delete"
                isDangerous={true}
            />
        </div>
    );
}

export default function ClientDetailsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <ClientDetailsContent />
        </Suspense>
    );
}
