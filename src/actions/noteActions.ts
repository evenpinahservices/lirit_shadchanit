"use server";

import connectToDatabase from "@/lib/db";
import NoteModel from "@/models/Note";
import { revalidatePath } from "next/cache";

export async function saveNote(userId: string, content: string) {
    try {
        await connectToDatabase();
        await NoteModel.findOneAndUpdate(
            { userId },
            { content },
            { upsert: true, new: true }
        );
        revalidatePath("/notes");
        return { success: true };
    } catch (error) {
        console.error("Failed to save note:", error);
        return { success: false, error: "Failed to save note" };
    }
}

export async function getNote(userId: string) {
    try {
        await connectToDatabase();
        const note = await NoteModel.findOne({ userId });
        return note ? note.content : "";
    } catch (error) {
        console.error("Failed to get note:", error);
        return "";
    }
}
