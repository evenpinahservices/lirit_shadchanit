"use client";

import { ClientForm } from "@/components/clients/ClientForm";
import { ClientProfileView } from "@/components/clients/ClientProfileView";
import { useClients } from "@/context/ClientContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Client } from "@/lib/mockData";

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

    if (loading) return <div>Loading...</div>;
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

    const getBackInfo = () => {
        switch (source) {
            case "matching":
                return { text: "Back to Matching", link: "/matching" };
            case "search":
                return { text: "Back to Search", link: "/search" };
            default:
                return { text: "Back to Clients", link: "/clients" };
        }
    };

    const { text: backText, link: backLink } = getBackInfo();

    if (isViewMode) {
        return (
            <div className="w-full max-w-4xl mx-auto h-[calc(100dvh-8rem)] flex flex-col space-y-2">
                <button
                    onClick={() => router.push(backLink)}
                    className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 shrink-0"
                >
                    &larr; {backText}
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
                    title="Delete Client"
                    message="Are you sure you want to delete this client? This action cannot be undone."
                    confirmText="Delete"
                    isDangerous={true}
                />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <button
                onClick={() => setIsViewMode(true)}
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1"
            >
                &larr; Back to Profile
            </button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Client</h1>
                <p className="text-muted-foreground">Update the client profile details.</p>
            </div>
            <ClientForm
                client={client}
                isEditing
                onCancel={() => setIsViewMode(true)}
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
        <Suspense fallback={<div>Loading...</div>}>
            <ClientDetailsContent />
        </Suspense>
    );
}
