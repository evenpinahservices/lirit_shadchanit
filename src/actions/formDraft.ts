"use server";

import dbConnect from "@/lib/db";
import FormDraftModel from "@/models/FormDraft";

const DRAFT_TTL_DAYS = 7;

function draftExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + DRAFT_TTL_DAYS);
    return d;
}

export interface SaveDraftInput {
    token: string;
    email?: string;
    phone?: string;
    formLanguage: "en" | "he";
    currentStep: number;
    data: Record<string, any>;
}

/**
 * Upsert a form draft.  Keyed by (token + email) or (token + phone).
 * Called automatically as the client progresses through the form.
 */
export async function saveFormDraft(input: SaveDraftInput): Promise<void> {
    await dbConnect();

    const filter: Record<string, any> = { token: input.token };
    if (input.email) {
        filter.email = input.email.trim().toLowerCase();
    } else if (input.phone) {
        filter.phone = input.phone.trim();
    } else {
        return; // can't store without an identifier
    }

    await FormDraftModel.findOneAndUpdate(
        filter,
        {
            $set: {
                formLanguage: input.formLanguage,
                currentStep: input.currentStep,
                data: input.data,
                lastSavedAt: new Date(),
                ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
                ...(input.phone ? { phone: input.phone.trim() } : {}),
            },
            $setOnInsert: {
                token: input.token,
                expiresAt: draftExpiry(),
            },
        },
        { upsert: true, new: true }
    );
}

/**
 * Retrieve the most recent draft for this identifier (email or phone).
 * Ignores token so a client who got a new link can still resume.
 */
export async function getFormDraft(
    email?: string,
    phone?: string
): Promise<{
    token: string;
    formLanguage: "en" | "he";
    currentStep: number;
    data: Record<string, any>;
    lastSavedAt: string;
} | null> {
    await dbConnect();

    const conditions: any[] = [];
    if (email) conditions.push({ email: email.trim().toLowerCase() });
    if (phone) conditions.push({ phone: phone.trim() });
    if (conditions.length === 0) return null;

    const draft = await FormDraftModel.findOne({
        $or: conditions,
        expiresAt: { $gt: new Date() },
    })
        .sort({ lastSavedAt: -1 })
        .lean();

    if (!draft) return null;

    return {
        token: draft.token,
        formLanguage: draft.formLanguage,
        currentStep: draft.currentStep,
        data: draft.data,
        lastSavedAt: draft.lastSavedAt.toISOString(),
    };
}

/**
 * Delete all drafts matching the identifier (called after successful submission).
 */
export async function deleteFormDraft(
    email?: string,
    phone?: string
): Promise<void> {
    await dbConnect();

    const conditions: any[] = [];
    if (email) conditions.push({ email: email.trim().toLowerCase() });
    if (phone) conditions.push({ phone: phone.trim() });
    if (conditions.length === 0) return;

    await FormDraftModel.deleteMany({ $or: conditions });
}
