"use server";

import dbConnect from "@/lib/db";
import { getMatchRecordModel } from "@/models/MatchRecord";
import { requireAuth } from "@/lib/serverAuth";
import { isValidObjectId } from "@/lib/validation";

export interface DismissedEntry {
    candidateId: string;
    status: "rejected" | "snoozed";
}

export async function getDismissedMatches(clientId: string): Promise<DismissedEntry[]> {
    const user = await requireAuth();
    if (!isValidObjectId(clientId)) throw new Error("Invalid client ID");

    const conn = await dbConnect(user.dbName);
    const Model = getMatchRecordModel(conn);

    const now = new Date();
    // Bidirectional: dismissing A→B should also hide A when viewing B's matches
    const statusFilter = {
        $or: [
            { status: "rejected" },
            { status: "snoozed", resuggestAfter: { $gt: now } },
        ],
    };
    const records = await Model.find({
        $and: [
            { $or: [{ clientId }, { candidateId: clientId }] },
            statusFilter,
        ],
    }).lean();

    return records.map((r: any) => ({
        candidateId: r.clientId === clientId ? r.candidateId : r.clientId,
        status: r.status as "rejected" | "snoozed",
    }));
}

export async function restoreMatch(clientId: string, candidateId: string): Promise<void> {
    const user = await requireAuth();
    if (!isValidObjectId(clientId) || !isValidObjectId(candidateId)) {
        throw new Error("Invalid ID");
    }
    const conn = await dbConnect(user.dbName);
    const Model = getMatchRecordModel(conn);
    // Bidirectional: a restore should clear the record regardless of which side dismissed
    await Model.deleteOne({
        $or: [
            { clientId, candidateId },
            { clientId: candidateId, candidateId: clientId },
        ],
    });
}

export async function dismissMatch(
    clientId: string,
    candidateId: string,
    matchLevel: 1 | 2,
    permanent: boolean
): Promise<void> {
    const user = await requireAuth();
    if (!isValidObjectId(clientId) || !isValidObjectId(candidateId)) {
        throw new Error("Invalid ID");
    }

    const conn = await dbConnect(user.dbName);
    const Model = getMatchRecordModel(conn);

    const resuggestAfter = permanent
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await Model.findOneAndUpdate(
        { clientId, candidateId },
        {
            $set: {
                matchLevel,
                status: permanent ? "rejected" : "snoozed",
                resuggestAfter,
            },
        },
        { upsert: true }
    );
}
