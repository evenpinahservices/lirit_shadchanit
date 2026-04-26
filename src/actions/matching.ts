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
    const records = await Model.find({
        clientId,
        $or: [
            { status: "rejected" },
            { status: "snoozed", resuggestAfter: { $gt: now } },
        ],
    }).lean();

    return records.map((r: any) => ({
        candidateId: r.candidateId,
        status: r.status as "rejected" | "snoozed",
    }));
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
