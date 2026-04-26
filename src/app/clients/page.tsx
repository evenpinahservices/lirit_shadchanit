"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useClients } from "@/context/ClientContext";
import { useBackgroundAiProgress } from "@/context/BackgroundAiProgressContext";
import { Plus, Pencil, Trash2, Heart, MapPin, Briefcase, Search, ChevronLeft, ChevronRight, User as UserIcon, Users, Clock, X, CheckCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ItemsPerPageSelector } from "@/components/ui/ItemsPerPageSelector";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { Client } from "@/lib/mockData";

type ClientStatus = "active" | "not_relevant" | "remind_later";
type TabFilter = "active" | "not_relevant" | "remind_later" | "all";

const STATUS_CONFIG: Record<ClientStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    active: { label: "Active", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    not_relevant: { label: "Not Relevant", icon: <X className="h-3 w-3" />, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    remind_later: { label: "Remind Later", icon: <Clock className="h-3 w-3" />, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
};

function StatusDropdown({ client, onUpdate }: { client: Client; onUpdate: (id: string, status: ClientStatus) => void }) {
    const [open, setOpen] = useState(false);
    const current = (client.clientStatus as ClientStatus) || "active";
    const config = STATUS_CONFIG[current];

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                    config.color, config.bg
                )}
                title="Change client status"
            >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-[140px] overflow-hidden">
                        {(Object.entries(STATUS_CONFIG) as [ClientStatus, typeof STATUS_CONFIG[ClientStatus]][]).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={(e) => { e.stopPropagation(); onUpdate(client.id, key); setOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                                    cfg.color,
                                    key === current && "font-bold"
                                )}
                            >
                                {cfg.icon}
                                {cfg.label}
                                {key === current && <span className="ml-auto opacity-60">✓</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function ClientsPage() {
    const { clients, deleteClient, updateClient, error, clearError, isLoading } = useClients();
    const aiProgress = useBackgroundAiProgress();
    const isUploadInProgress = aiProgress?.isProcessing ?? false;
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<TabFilter>("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | "all">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("itemsPerPage");
            if (saved) {
                if (saved === "all") return "all";
                const num = parseInt(saved, 10);
                if (!isNaN(num)) return num;
            }
        }
        return "all";
    });

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<string | null>(null);

    const handleDeleteClick = (clientId: string) => {
        setClientToDelete(clientId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (clientToDelete) {
            deleteClient(clientToDelete);
            setClientToDelete(null);
        }
    };

    const handleStatusUpdate = async (clientId: string, status: ClientStatus) => {
        await updateClient(clientId, { clientStatus: status });
    };

    // Tab counts (based on search term too)
    const searchFiltered = clients.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const tabCounts: Record<TabFilter, number> = {
        active: searchFiltered.filter(c => !c.clientStatus || c.clientStatus === "active").length,
        not_relevant: searchFiltered.filter(c => c.clientStatus === "not_relevant").length,
        remind_later: searchFiltered.filter(c => c.clientStatus === "remind_later").length,
        all: searchFiltered.length,
    };

    const filteredClients = searchFiltered.filter(client => {
        if (activeTab === "all") return true;
        if (activeTab === "active") return !client.clientStatus || client.clientStatus === "active";
        return client.clientStatus === activeTab;
    });

    // Reset to page 1 when tab/search changes
    useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm]);

    // Calculate pagination
    const effectiveItemsPerPage = itemsPerPage === "all" ? filteredClients.length : itemsPerPage;
    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, startIndex + effectiveItemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleItemsPerPageChange = (value: number | "all") => {
        setItemsPerPage(value);
        setCurrentPage(1);
        if (typeof window !== "undefined") {
            localStorage.setItem("itemsPerPage", value === "all" ? "all" : value.toString());
        }
    };

    // Swipe navigation for pagination
    const swipeRef = useSwipeNavigation({
        onSwipeLeft: () => { if (currentPage < totalPages) handlePageChange(currentPage + 1); },
        onSwipeRight: () => { if (currentPage > 1) handlePageChange(currentPage - 1); },
        enabled: totalPages > 1,
    });

    const calculateAge = (dob: string) => {
        if (!dob || dob === "NaN") return "N/A";
        const year = dob.length <= 4 ? parseInt(dob, 10) : new Date(dob).getFullYear();
        if (!year || isNaN(year) || year < 1900 || year > new Date().getFullYear()) return "N/A";
        return new Date().getFullYear() - year;
    };

    const TABS: { key: TabFilter; label: string; icon?: React.ReactNode }[] = [
        { key: "active", label: "Active", icon: <CheckCircle className="h-3.5 w-3.5" /> },
        { key: "remind_later", label: "Remind Later", icon: <Clock className="h-3.5 w-3.5" /> },
        { key: "not_relevant", label: "Not Relevant", icon: <X className="h-3.5 w-3.5" /> },
        { key: "all", label: "All" },
    ];

    return (
        <div id="clients-page-root" ref={swipeRef} className="flex flex-col h-full min-h-0 gap-4 overflow-hidden relative z-0">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-red-600 dark:text-red-400 font-medium">Error: {error}</span>
                    <button onClick={clearError} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium">
                        Dismiss
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-8 w-8 text-red-600" />
                        Clients
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Manage your client database.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isUploadInProgress ? (
                        <span className="inline-flex items-center justify-center rounded-md bg-red-600/50 px-4 py-2 text-sm font-medium text-white shadow cursor-not-allowed" title="An AI upload is in progress. Wait for it to finish.">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
                        </span>
                    ) : (
                        <Link href="/clients/new" className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
                        </Link>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative shrink-0 px-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search clients by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-950 dark:border-gray-800"
                />
            </div>

            {/* Status Tabs */}
            <div className="shrink-0 px-1 flex gap-1 border-b border-gray-200 dark:border-gray-800">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                            activeTab === tab.key
                                ? "border-red-600 text-red-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full font-medium",
                            activeTab === tab.key
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        )}>
                            {tabCounts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Desktop Table View */}
            <div id="tour-client-results-desktop" className="hidden md:block rounded-md bg-white dark:bg-gray-950 shadow-sm overflow-y-auto flex-1 min-h-0 max-h-[calc(100dvh-16rem)] custom-scrollbar">
                <div className="h-full">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Age/Gender</th>
                                <th className="px-6 py-3 font-medium">Location</th>
                                <th className="px-6 py-3 font-medium">Occupation</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <span className="text-sm">Loading clients…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        {searchTerm ? "No clients found matching your search." : activeTab === "active" ? "No active clients." : activeTab === "not_relevant" ? "No clients marked as not relevant." : activeTab === "remind_later" ? "No clients snoozed." : "No clients found."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedClients.map((client, index) => (
                                    <tr key={client.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors", (client.clientStatus === "not_relevant" || client.clientStatus === "remind_later") && "opacity-70")}>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            <Link href={`/clients/${client.id}`} className="hover:text-red-600 transition-colors flex items-center gap-2">
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
                                                {client.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" />
                                                {client.occupationTitle || "—"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusDropdown client={client} onUpdate={handleStatusUpdate} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/clients/${client.id}?mode=edit`}
                                                    id={index === 0 ? "tour-client-edit-btn" : undefined}
                                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={`/matching?clientId=${client.id}&view=results`}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Match"
                                                >
                                                    <Heart className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(client.id)}
                                                    id={index === 0 ? "tour-client-delete-btn" : undefined}
                                                    className="p-2 text-gray-400 hover:text-danger-600 transition-colors"
                                                    title="Delete"
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
            <div id="tour-client-results-mobile" className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3 px-1 pb-32 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                        <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Loading clients…</span>
                    </div>
                ) : paginatedClients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchTerm ? "No results found." : "No clients in this category."}
                    </div>
                ) : (
                    paginatedClients.map((client, index) => (
                        <div key={client.id} className={cn("bg-white dark:bg-gray-950 p-4 rounded-xl shadow-sm flex items-center gap-4", (client.clientStatus === "not_relevant" || client.clientStatus === "remind_later") && "opacity-70")}>
                            <Link href={`/clients/${client.id}`} className="shrink-0 relative">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {client.photoUrl ? (
                                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-6 w-6 text-gray-400" />
                                    )}
                                </div>
                            </Link>

                            <Link href={`/clients/${client.id}`} className="flex-1 min-w-0 group">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-red-600 transition-colors">{client.fullName}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-0.5">
                                    <p>{calculateAge(client.dob)} y/o • {client.gender}</p>
                                    <p className="truncate">{client.location}</p>
                                    <p className="truncate text-gray-400">{client.occupationTitle || "—"}</p>
                                </div>
                            </Link>

                            <div className="flex flex-col gap-1 shrink-0 items-end">
                                <StatusDropdown client={client} onUpdate={handleStatusUpdate} />
                                <div className="flex gap-1 mt-1">
                                    <Link
                                        href={`/clients/${client.id}?mode=edit`}
                                        id={index === 0 ? "tour-client-edit-btn-mobile" : undefined}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-full"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href={`/matching?clientId=${client.id}&view=results`}
                                        className="p-2 text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20 rounded-full"
                                        title="Match"
                                    >
                                        <Heart className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteClick(client.id)}
                                        id={index === 0 ? "tour-client-delete-btn-mobile" : undefined}
                                        className="p-2 text-danger-600 hover:text-danger-700 bg-danger-50 dark:bg-danger-900/20 rounded-full"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-2 px-2 md:px-4 py-2 bg-white dark:bg-gray-950 z-20 md:static md:p-0 md:pb-4 md:bg-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:shadow-none overflow-visible">
                <div className="flex-shrink-0 relative z-30">
                    <ItemsPerPageSelector
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        totalItems={filteredClients.length}
                    />
                </div>
                {totalPages > 1 && (
                    <>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                            style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                        >
                            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Prev</span>
                        </button>
                        <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                    </>
                )}
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
