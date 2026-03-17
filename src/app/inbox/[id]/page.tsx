"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getPendingClients, approvePendingClient, rejectPendingClient, willOverwriteApprovedClient, updatePendingClient } from "@/actions/pendingClient";
import { ClientForm } from "@/components/clients/ClientForm";
import { Client } from "@/lib/mockData";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ErrorAlertModal } from "@/components/ui/ErrorAlertModal";
import { getFriendlyError } from "@/lib/errorMessages";
import type { FriendlyError } from "@/lib/errorMessages";

export default function InboxApprovalPage() {
    const params = useParams();
    const router = useRouter();
    const pendingClientId = params.id as string;
    
    const [pendingClient, setPendingClient] = useState<(Client & { source?: string }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [willOverwrite, setWillOverwrite] = useState(false);
    const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);

    useEffect(() => {
        const loadPendingClient = async () => {
            try {
                setIsLoading(true);
                const clients = await getPendingClients();
                const client = clients.find(c => c.id === pendingClientId);
                if (client) {
                    // Convert pending client to regular client format (keep source for AI-draft detection)
                    const { submittedAt, submittedBy, token, ...clientData } = client as any;
                    setPendingClient({ ...clientData } as Client);
                    
                    // Check if this will overwrite an existing approved client
                    const overwriteCheck = await willOverwriteApprovedClient(pendingClientId);
                    console.log("Inbox page - overwrite check result:", overwriteCheck);
                    setWillOverwrite(overwriteCheck.willOverwrite);
                } else {
                    // Client not found, redirect back to inbox
                    router.push("/inbox");
                }
            } catch (error: any) {
                console.error("Failed to load pending client:", error);
                router.push("/inbox");
            } finally {
                setIsLoading(false);
            }
        };

        if (pendingClientId) {
            loadPendingClient();
        }
    }, [pendingClientId, router]);

    const handleApprove = async (shouldOverwrite: boolean = false) => {
        if (!pendingClientId) return;
        
        setIsApproving(true);
        try {
            const approvedClient = await approvePendingClient(pendingClientId, shouldOverwrite);
            // Navigate to matching page to show matches for the newly approved client
            router.push(`/matching?clientId=${approvedClient.id}&view=results`);
        } catch (error: any) {
            console.error("Failed to approve client:", error);
            setFriendlyError(getFriendlyError(error, "approve-client"));
        } finally {
            setIsApproving(false);
            setApproveModalOpen(false);
        }
    };

    const handleReject = async () => {
        if (!pendingClientId) return;
        
        setIsRejecting(true);
        try {
            await rejectPendingClient(pendingClientId);
            router.push("/inbox");
        } catch (error: any) {
            console.error("Failed to reject client:", error);
            setFriendlyError(getFriendlyError(error, "reject-client"));
        } finally {
            setIsRejecting(false);
            setRejectModalOpen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading client details...</p>
                </div>
            </div>
        );
    }

    if (!pendingClient) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground">Client not found</p>
                <Link
                    href="/inbox"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Pending
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-4">
            <div className="flex items-center gap-4 shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Review Client Submission</h1>
                    <p className="text-muted-foreground">
                        Review the client information and approve to add them to the database.
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <ClientForm 
                    client={pendingClient} 
                    isEditing={pendingClient.source === "admin_ai_draft"} 
                    language={pendingClient.formLanguage || "en"}
                    onCancel={() => router.push("/inbox")}
                    onApprove={() => setApproveModalOpen(true)}
                    onReject={() => setRejectModalOpen(true)}
                    onSubmitToPending={pendingClient.source === "admin_ai_draft" ? async (values) => {
                        await updatePendingClient(pendingClientId, values as any);
                    } : undefined}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    hideAutoFillOptions={true}
                />
            </div>

            <ConfirmationModal
                isOpen={approveModalOpen}
                onClose={() => setApproveModalOpen(false)}
                onConfirm={() => handleApprove(willOverwrite)}
                title={willOverwrite ? "Warning: Overwrite Existing Profile" : "Approve Client"}
                message={willOverwrite 
                    ? "You're about to change an already approved profile. This will permanently update the existing client's information with the new data from this submission. Are you sure you want to proceed?"
                    : "Are you sure you want to approve this client and add them to the database? They will be available for matching immediately."}
                confirmText={willOverwrite ? "Yes, Overwrite Profile" : "Approve"}
                isDangerous={willOverwrite}
            />
            <ConfirmationModal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={handleReject}
                title="Reject Client Submission"
                message="Are you sure you want to reject this client submission? This action cannot be undone."
                confirmText="Reject"
                isDangerous={true}
            />
            <ErrorAlertModal
                isOpen={!!friendlyError}
                onClose={() => setFriendlyError(null)}
                error={friendlyError}
            />
        </div>
    );
}
