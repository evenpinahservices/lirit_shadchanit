"use client";

import { useEffect, useState } from "react";
import { getBugReports, updateBugReportStatus } from "@/actions/bug";
import { Bug, ExternalLink, CheckCircle, Eye, Clock, ChevronLeft, Archive, ArchiveRestore } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Simplified type for frontend use
interface BugReportData {
    _id: string;
    screenshotUrl: string;
    description: string;
    metadata: {
        timestamp: Date;
        pathname: string;
        userAgent: string;
        viewport: { width: number; height: number };
        screenResolution: { width: number; height: number };
        userName: string;
        userRole: string;
    };
    status: "new" | "reviewed" | "resolved";
    archived: boolean;
    archivedAt?: string;
    createdAt: string;
}

export default function BugReportsPage() {
    const [reports, setReports] = useState<BugReportData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<BugReportData | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect if not admin (simple check)
        const checkAuth = () => {
            const storedUser = localStorage.getItem("mock_user");
            if (!storedUser) {
                router.push("/login?redirect=/bugs");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "admin") {
                router.push("/");
                return;
            }
            loadReports();
        };
        checkAuth();
    }, [router, showArchived]);

    const loadReports = async () => {
        setIsLoading(true);
        const data = await getBugReports(showArchived);
        setReports(data as any[]);
        setIsLoading(false);
    };

    const handleStatusChange = async (id: string, status: "new" | "reviewed" | "resolved") => {
        await updateBugReportStatus(id, status);
        await loadReports();
        if (selectedReport && (selectedReport as any)._id === id) {
            setSelectedReport({ ...selectedReport, status });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "new": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "reviewed": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "resolved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "new": return <Clock className="h-3 w-3" />;
            case "reviewed": return <Eye className="h-3 w-3" />;
            case "resolved": return <CheckCircle className="h-3 w-3" />;
            default: return null;
        }
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 overflow-hidden p-4">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Bug className="h-8 w-8 text-orange-500" />
                    <div>
                        <h1 className="text-2xl font-bold">Bug Reports</h1>
                        <p className="text-sm text-muted-foreground">
                            {reports.length} {showArchived ? "archived" : "active"} reports
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setShowArchived(!showArchived);
                            setSelectedReport(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            showArchived
                                ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                        }`}
                    >
                        {showArchived ? (
                            <>
                                <ArchiveRestore className="h-4 w-4" />
                                Show Active
                            </>
                        ) : (
                            <>
                                <Archive className="h-4 w-4" />
                                Show Archived
                            </>
                        )}
                    </button>
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-4">
                {/* Reports List */}
                <div className="w-1/3 overflow-y-auto border rounded-lg bg-white dark:bg-gray-950">
                    {reports.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {showArchived ? "No archived bug reports." : "No bug reports yet."}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {reports.map((report: any) => (
                                <button
                                    key={report._id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                                        selectedReport && (selectedReport as any)._id === report._id 
                                            ? "bg-orange-50 dark:bg-orange-900/20" 
                                            : ""
                                    } ${report.archived ? "opacity-60" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">{report.metadata.pathname}</p>
                                                {report.archived && (
                                                    <Archive className="h-3 w-3 text-gray-400" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{report.description}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(report.createdAt)}
                                                {report.archivedAt && (
                                                    <span className="ml-2">• Archived {formatDate(report.archivedAt)}</span>
                                                )}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(report.status)}`}>
                                            {getStatusIcon(report.status)}
                                            {report.status}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Report Detail */}
                <div className="flex-1 overflow-y-auto border rounded-lg bg-white dark:bg-gray-950 p-6">
                    {selectedReport ? (
                        <div className="space-y-6">
                            {/* Screenshot */}
                            {selectedReport.screenshotUrl && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Screenshot</h3>
                                    <a
                                        href={selectedReport.screenshotUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block border rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                    >
                                        <img
                                            src={selectedReport.screenshotUrl}
                                            alt="Bug screenshot"
                                            className="w-full h-auto"
                                        />
                                    </a>
                                    <a
                                        href={selectedReport.screenshotUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline mt-2"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open full size
                                    </a>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                                <p className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{selectedReport.description}</p>
                            </div>

                            {/* Metadata */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Metadata</h3>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm space-y-2">
                                    <p><strong>Timestamp:</strong> {formatDate(selectedReport.metadata.timestamp)}</p>
                                    <p><strong>Page:</strong> {selectedReport.metadata.pathname}</p>
                                    <p><strong>User:</strong> {selectedReport.metadata.userName} ({selectedReport.metadata.userRole})</p>
                                    <p><strong>Viewport:</strong> {selectedReport.metadata.viewport.width}x{selectedReport.metadata.viewport.height}</p>
                                    <p><strong>Screen:</strong> {selectedReport.metadata.screenResolution.width}x{selectedReport.metadata.screenResolution.height}</p>
                                    <p className="truncate"><strong>User Agent:</strong> {selectedReport.metadata.userAgent}</p>
                                </div>
                            </div>

                            {/* Status Actions */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleStatusChange((selectedReport as any)._id, "new")}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport.status === "new"
                                            ? "bg-red-600 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        New
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange((selectedReport as any)._id, "reviewed")}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport.status === "reviewed"
                                            ? "bg-yellow-600 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        Reviewed
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange((selectedReport as any)._id, "resolved")}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport.status === "resolved"
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        Resolved
                                    </button>
                                </div>
                                {selectedReport.archived && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                            <Archive className="h-3 w-3" />
                                            This bug report has been archived. It was automatically archived when marked as resolved.
                                            {selectedReport.archivedAt && (
                                                <span className="ml-1">Archived on {formatDate(selectedReport.archivedAt)}</span>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select a bug report to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
