"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    listUsers,
    listPendingInvites,
    createInviteToken,
    deleteUser,
    resetUserPassword,
    startImpersonation,
    migrateUnnamedHebrewClients,
    type UserSummary,
    type InviteTokenSummary,
    type MigrateUnnamedResult,
} from "@/actions/admin";
import {
    Users,
    Link as LinkIcon,
    Trash2,
    KeyRound,
    Eye,
    Copy,
    Check,
    Loader2,
    ShieldCheck,
} from "lucide-react";

export default function AdminPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<UserSummary[]>([]);
    const [invites, setInvites] = useState<InviteTokenSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Per-row action state
    const [resetting, setResetting] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [impersonating, setImpersonating] = useState<string | null>(null);
    const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

    // Invite state
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Migration state
    const [migrating, setMigrating] = useState(false);
    const [migrateResult, setMigrateResult] = useState<MigrateUnnamedResult | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [u, i] = await Promise.all([listUsers(), listPendingInvites()]);
            setUsers(u);
            setInvites(i);
        } catch (e: any) {
            setError(e?.message || "Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== "admin") {
            router.replace("/");
            return;
        }
        load();
    }, [user, router, load]);

    const handleGenerateInvite = async () => {
        setGeneratingInvite(true);
        try {
            const invite = await createInviteToken();
            setInvites((prev) => [invite, ...prev]);
        } catch (e: any) {
            setError(e?.message || "Failed to generate invite.");
        } finally {
            setGeneratingInvite(false);
        }
    };

    const handleCopy = async (url: string, token: string) => {
        await navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleResetPassword = async (userId: string) => {
        setResetting(userId);
        try {
            const newPw = await resetUserPassword(userId);
            setResetPasswords((prev) => ({ ...prev, [userId]: newPw }));
        } catch (e: any) {
            setError(e?.message || "Failed to reset password.");
        } finally {
            setResetting(null);
        }
    };

    const handleDelete = async (userId: string, username: string) => {
        if (!confirm(`Delete user "${username}" and all their data? This cannot be undone.`)) return;
        setDeleting(userId);
        try {
            await deleteUser(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (e: any) {
            setError(e?.message || "Failed to delete user.");
        } finally {
            setDeleting(null);
        }
    };

    const handleMigrateUnnamed = async () => {
        if (!confirm("This will rename all unnamed Hebrew profiles to 'ללא שם'. Continue?")) return;
        setMigrating(true);
        setMigrateResult(null);
        try {
            const result = await migrateUnnamedHebrewClients();
            setMigrateResult(result);
        } catch (e: any) {
            setError(e?.message || "Migration failed.");
        } finally {
            setMigrating(false);
        }
    };

    const handleImpersonate = async (targetUserId: string) => {
        setImpersonating(targetUserId);
        try {
            await startImpersonation(targetUserId);
            router.push("/");
            router.refresh();
        } catch (e: any) {
            setError(e?.message || "Failed to start impersonation.");
            setImpersonating(null);
        }
    };

    if (user?.role !== "admin") return null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-red-500" />
                <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 text-sm p-3 rounded-md">
                    {error}
                </div>
            )}

            {/* ─── Users ──────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5" /> Users
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">Name</th>
                                    <th className="text-left px-4 py-3 font-medium">Username</th>
                                    <th className="text-left px-4 py-3 font-medium">Role</th>
                                    <th className="text-left px-4 py-3 font-medium">Clients</th>
                                    <th className="text-left px-4 py-3 font-medium">Database</th>
                                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-3 font-medium">{u.name}</td>
                                        <td className="px-4 py-3 text-gray-500">@{u.username}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                    u.role === "admin"
                                                        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                                }`}
                                            >
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{u.clientCount}</td>
                                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                            {u.dbName || "default"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* View as */}
                                                {u.id !== user.id && (
                                                    <button
                                                        onClick={() => handleImpersonate(u.id)}
                                                        disabled={!!impersonating}
                                                        title={`View as ${u.username}`}
                                                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                                                    >
                                                        {impersonating === u.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}

                                                {/* Reset password */}
                                                <button
                                                    onClick={() => handleResetPassword(u.id)}
                                                    disabled={resetting === u.id}
                                                    title="Reset password"
                                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-amber-600 disabled:opacity-40"
                                                >
                                                    {resetting === u.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <KeyRound className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Delete */}
                                                {u.id !== user.id && (
                                                    <button
                                                        onClick={() => handleDelete(u.id, u.username)}
                                                        disabled={deleting === u.id}
                                                        title="Delete user"
                                                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600 disabled:opacity-40"
                                                    >
                                                        {deleting === u.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Show reset password result inline */}
                                            {resetPasswords[u.id] && (
                                                <div className="mt-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded font-mono">
                                                    New password: {resetPasswords[u.id]}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ─── Data Migrations ────────────────────── */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Data Migrations</h2>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">Rename unnamed Hebrew profiles</p>
                            <p className="text-xs text-muted-foreground">Finds all profiles with an empty name, detects language, and renames Hebrew ones to "ללא שם".</p>
                        </div>
                        <button
                            onClick={handleMigrateUnnamed}
                            disabled={migrating}
                            className="shrink-0 flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 transition-colors"
                        >
                            {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {migrating ? "Running…" : "Run"}
                        </button>
                    </div>
                    {migrateResult && (
                        <div className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded p-3 space-y-1">
                            <p className="font-medium">Done — scanned {migrateResult.scanned} unnamed profiles, renamed {migrateResult.renamed} Hebrew profiles.</p>
                            {migrateResult.details.map((d) => (
                                <p key={d.user}>{d.user}: {d.renamed} renamed</p>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── Invite Links ───────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" /> Invite Links
                    </h2>
                    <button
                        onClick={handleGenerateInvite}
                        disabled={generatingInvite}
                        className="flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 transition-colors"
                    >
                        {generatingInvite ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <LinkIcon className="w-4 h-4" />
                        )}
                        Generate invite link
                    </button>
                </div>

                {invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending invites.</p>
                ) : (
                    <div className="space-y-2">
                        {invites.map((inv) => (
                            <div
                                key={inv.token}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono text-gray-500 truncate">{inv.url}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCopy(inv.url, inv.token)}
                                    className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                    title="Copy link"
                                >
                                    {copiedToken === inv.token ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
