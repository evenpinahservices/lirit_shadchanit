"use client";

import { useState } from "react";
import Link from "next/link";
import { useClients } from "@/context/ClientContext";
import { Plus, Pencil, Trash2, MapPin, Briefcase, Search, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
    const { clients, deleteClient } = useClients();
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const filteredClients = clients.filter(client =>
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // Helper to calculate age from DOB
    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    return (
        <div className="flex flex-col h-full space-y-4 pb-20 md:pb-0">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground hidden md:block">Manage your client database.</p>
                </div>
                <Link
                    href="/clients/new"
                    className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                </Link>
            </div>

            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search clients by name..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to page 1 on search
                    }}
                    className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-950 dark:border-gray-800"
                />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border bg-white dark:bg-gray-950 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Age/Gender</th>
                                <th className="px-6 py-3 font-medium">Location</th>
                                <th className="px-6 py-3 font-medium">Occupation</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 overflow-y-auto">
                            {paginatedClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        {searchTerm ? "No clients found matching your search." : "No clients found. Add your first client to get started."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            <Link href={`/clients/${client.id}`} className="hover:underline flex items-center gap-2">
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
                                                {client.occupation}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/clients/${client.id}`}
                                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to delete this client?")) {
                                                            deleteClient(client.id);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3">
                {paginatedClients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchTerm ? "No results found." : "No clients yet."}
                    </div>
                ) : (
                    paginatedClients.map((client) => (
                        <div key={client.id} className="bg-white dark:bg-gray-950 p-4 rounded-xl shadow-sm border flex items-center gap-4">
                            <Link href={`/clients/${client.id}`} className="shrink-0 relative">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-800">
                                    {client.photoUrl ? (
                                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-6 w-6 text-gray-400" />
                                    )}
                                </div>
                            </Link>

                            <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.fullName}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-0.5">
                                    <p>{calculateAge(client.dob)} y/o • {client.gender}</p>
                                    <p className="truncate">{client.location}</p>
                                    <p className="truncate text-gray-400">{client.occupation}</p>
                                </div>
                            </Link>

                            <div className="flex flex-col gap-1 shrink-0">
                                <Link
                                    href={`/clients/${client.id}`}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-full"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete?")) {
                                            deleteClient(client.id);
                                        }
                                    }}
                                    className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-full"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 shrink-0 border-t md:border-t-0 md:pt-0">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
