"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { saveNoteByUserId, getNoteByUserId } from "@/actions/noteActions";
import { Loader2, Save, StickyNote } from "lucide-react";

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
            const noteContent = await getNoteByUserId(user.id);
            setContent(noteContent || "");
            setIsLoading(false);
        };
        load();
    }, [user?.id]);

    // Auto-save note
    useEffect(() => {
        if (!user?.id || isLoading) return;

        const timeoutId = setTimeout(async () => {
            setIsSaving(true);
            await saveNoteByUserId(user.id, content);
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
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading notes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <StickyNote className="h-8 w-8 text-red-600" />
                        My Notes
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Keep your personal notes and reminders.</p>
                </div>
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
                className="flex-1 w-full p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-950 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] text-sm placeholder:text-sm"
                placeholder="Type your notes here..."
            />
        </div>
    );
}
