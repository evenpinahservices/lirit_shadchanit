"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPendingClients, rejectPendingClient } from "@/actions/pendingClient";
import { calculateAge } from "@/lib/matchingUtils";
import { Hourglass, MapPin, Briefcase, Search, User as UserIcon, Trash2, Clock, CheckCircle2, Link as LinkIcon, MessageSquare, FileText, Inbox, Sparkles } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ErrorAlertModal } from "@/components/ui/ErrorAlertModal";
import { getFriendlyError } from "@/lib/errorMessages";
import type { FriendlyError } from "@/lib/errorMessages";

interface PendingClient {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    location: string;
    gender: "Male" | "Female";
    occupationTitle: string;
    photoUrl?: string;
    submittedAt: string;
    submittedBy?: string;
    source?: "client_form" | "whatsapp" | "admin_manual" | "admin_ai_draft";
    sourceDescription?: string;
}

export default function InboxPage() {
    const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [clientToReject, setClientToReject] = useState<string | null>(null);
    const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);

    const loadPendingClients = async () => {
        try {
            setIsLoading(true);
            const clients = await getPendingClients();
            setPendingClients(clients as any);
        } catch (error: any) {
            console.error("Failed to load pending clients:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPendingClients();
    }, []);

    const handleRejectClick = (clientId: string) => {
        setClientToReject(clientId);
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (clientToReject) {
            try {
                await rejectPendingClient(clientToReject);
                await loadPendingClients();
                setClientToReject(null);
            } catch (error: any) {
                console.error("Failed to reject client:", error);
                setFriendlyError(getFriendlyError(error, "reject-client"));
            }
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { 
            year: "numeric", 
            month: "short", 
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredClients = pendingClients.filter(client =>
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading pending clients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden relative z-0">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Hourglass className="h-7 w-7 text-red-600" />
                        Pending
                    </h1>
                    <p className="text-muted-foreground hidden md:block">
                        Review and approve pending client submissions.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/inbox/generate-link"
                        className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                        style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                    >
                        <LinkIcon className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Generate Form Link</span>
                        <span className="sm:hidden">Generate Link</span>
                    </Link>
                </div>
            </div>

            <div className="relative shrink-0 px-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search pending clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-950 dark:border-gray-800"
                />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md bg-white dark:bg-gray-950 shadow-sm overflow-y-auto flex-1 min-h-0 max-h-[calc(100dvh-12rem)] custom-scrollbar">
                <div className="h-full">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Age/Gender</th>
                                <th className="px-6 py-3 font-medium">Location</th>
                                <th className="px-6 py-3 font-medium">Source</th>
                                <th className="px-6 py-3 font-medium">Submitted</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchTerm ? (
                                            "No pending clients found matching your search."
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Inbox className="h-12 w-12 text-gray-300 mb-2" />
                                                <p className="text-lg font-medium">No pending submissions</p>
                                                <p className="text-sm">All caught up! New client submissions will appear here.</p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            <Link href={`/inbox/${client.id}`} className="hover:text-red-600 transition-colors flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                    {client.photoUrl ? (
                                                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                                {client.fullName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            {calculateAge(client.dob)} / {client.gender}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {client.location || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                {client.source === "whatsapp" ? (
                                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                                ) : client.source === "client_form" ? (
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                ) : client.source === "admin_ai_draft" ? (
                                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                                ) : (
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                )}
                                                <span className="text-xs">
                                                    {client.sourceDescription || 
                                                     (client.source === "whatsapp" ? "WhatsApp" : 
                                                      client.source === "client_form" ? "Client Form" : 
                                                      client.source === "admin_ai_draft" ? "AI-generated form by admin" : "Manual")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(client.submittedAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/inbox/${client.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Review
                                                </Link>
                                                <button
                                                    onClick={() => handleRejectClick(client.id)}
                                                    className="p-2 text-gray-400 hover:text-danger-600 transition-colors"
                                                    title="Reject"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3 px-1 pb-32 custom-scrollbar">
                {filteredClients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchTerm ? (
                            "No results found."
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Inbox className="h-12 w-12 text-gray-300 mb-2" />
                                <p className="text-lg font-medium">No pending submissions</p>
                                <p className="text-sm">All caught up!</p>
                            </div>
                        )}
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <div key={client.id} className="bg-white dark:bg-gray-950 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <Link href={`/inbox/${client.id}`} className="flex items-center gap-4 mb-3 group">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {client.photoUrl ? (
                                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-6 w-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-red-600 transition-colors">{client.fullName}</h3>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-0.5">
                                        <p>{calculateAge(client.dob)} y/o • {client.gender}</p>
                                        <p className="truncate">{client.location || "N/A"}</p>
                                        <p className="flex items-center gap-1">
                                            {client.source === "whatsapp" ? (
                                                <MessageSquare className="h-3 w-3 text-blue-600" />
                                            ) : client.source === "client_form" ? (
                                                <FileText className="h-3 w-3 text-green-600" />
                                            ) : client.source === "admin_ai_draft" ? (
                                                <Sparkles className="h-3 w-3 text-purple-600" />
                                            ) : (
                                                <FileText className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span>
                                                {client.sourceDescription || 
                                                 (client.source === "whatsapp" ? "WhatsApp" : 
                                                  client.source === "client_form" ? "Client Form" : 
                                                  client.source === "admin_ai_draft" ? "AI-generated form by admin" : "Manual")}
                                            </span>
                                        </p>
                                        <p className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(client.submittedAt)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                                <Link
                                    href={`/inbox/${client.id}`}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Review & Approve
                                </Link>
                                <button
                                    onClick={() => handleRejectClick(client.id)}
                                    className="p-2 text-danger-600 hover:text-danger-700 bg-danger-50 dark:bg-danger-900/20 rounded-md"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={confirmReject}
                title="Reject Submission"
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
