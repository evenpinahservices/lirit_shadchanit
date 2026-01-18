"use server";

import connectToDatabase from "@/lib/db";
import NoteModel from "@/models/Note";
import { revalidatePath } from "next/cache";

export interface NoteData {
    id: string;
    title: string;
    content: string;
    updatedAt: Date;
    createdAt: Date;
}

export async function getAllNotes(userId: string): Promise<NoteData[]> {
    try {
        await connectToDatabase();
        const notes = await NoteModel.find({ userId }).sort({ updatedAt: -1 });
        return notes.map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            updatedAt: note.updatedAt,
            createdAt: note.createdAt,
        }));
    } catch (error) {
        console.error("Failed to get notes:", error);
        return [];
    }
}

export async function getNote(noteId: string): Promise<NoteData | null> {
    try {
        await connectToDatabase();
        const note = await NoteModel.findById(noteId);
        if (!note) return null;
        return {
            id: note.id,
            title: note.title,
            content: note.content,
            updatedAt: note.updatedAt,
            createdAt: note.createdAt,
        };
    } catch (error) {
        console.error("Failed to get note:", error);
        return null;
    }
}

export async function createNote(userId: string, title: string = "Untitled Note") {
    try {
        await connectToDatabase();
        const note = await NoteModel.create({
            userId,
            title,
            content: "",
        });
        revalidatePath("/notes");
        return { success: true, noteId: note.id };
    } catch (error) {
        console.error("Failed to create note:", error);
        return { success: false, error: "Failed to create note" };
    }
}

export async function saveNote(noteId: string, content: string) {
    try {
        await connectToDatabase();
        await NoteModel.findByIdAndUpdate(noteId, { content });
        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to save note:", error);
        return { success: false, error: "Failed to save note" };
    }
}

export async function renameNote(noteId: string, title: string) {
    try {
        await connectToDatabase();
        await NoteModel.findByIdAndUpdate(noteId, { title });
        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to rename note:", error);
        return { success: false, error: "Failed to rename note" };
    }
}

export async function deleteNote(noteId: string) {
    try {
        await connectToDatabase();
        await NoteModel.findByIdAndDelete(noteId);
        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete note:", error);
        return { success: false, error: "Failed to delete note" };
    }
}

// Single note functions (for backward compatibility)
export async function saveNoteByUserId(userId: string, content: string) {
    try {
        await connectToDatabase();
        await NoteModel.findOneAndUpdate(
            { userId },
            { content, title: "My Notes" },
            { upsert: true, new: true }
        );
        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to save note:", error);
        return { success: false, error: "Failed to save note" };
    }
}

export async function getNoteByUserId(userId: string): Promise<string> {
    try {
        await connectToDatabase();
        const note = await NoteModel.findOne({ userId });
        return note ? note.content : "";
    } catch (error) {
        console.error("Failed to get note:", error);
        return "";
    }
}
