"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { saveNote, getNote } from "@/actions/noteActions";
import { Loader2, Save } from "lucide-react";
import { useDebounce } from "@/lib/hooks"; // Assuming hooks exist, or I'll implement debounce locally if not

export default function NotesPage() {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Load initial note
    useEffect(() => {
        if (!user?.id) return;

        const load = async () => {
            const noteContent = await getNote(user.id);
            setContent(noteContent || "");
            setIsLoading(false);
        };
        load();
    }, [user?.id]);

    // Simple debounce logic since I don't know if useDebounce exists
    useEffect(() => {
        if (!user?.id || isLoading) return;

        const timeoutId = setTimeout(async () => {
            setIsSaving(true);
            await saveNote(user.id, content);
            setIsSaving(false);
            setLastSaved(new Date());
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [content, user?.id, isLoading]);

    if (!user) {
        return <div className="p-4 text-center">Please log in to view notes.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">My Notes</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-blue-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                        </span>
                    ) : lastSaved ? (
                        <span className="flex items-center gap-1 text-green-600">
                            <Save className="h-3 w-3" />
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    ) : null}
                </div>
            </div>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-950 dark:border-gray-800"
                placeholder="Type your notes here..."
            />
        </div>
    );
}
