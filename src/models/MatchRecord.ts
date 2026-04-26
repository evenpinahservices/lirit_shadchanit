import mongoose, { Schema, Model, Connection } from "mongoose";

export interface IMatchRecord {
    clientId: string;
    candidateId: string;
    matchLevel: 1 | 2;
    status: "rejected" | "snoozed";
    resuggestAfter: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const MatchRecordSchema = new Schema<IMatchRecord>(
    {
        clientId: { type: String, required: true },
        candidateId: { type: String, required: true },
        matchLevel: { type: Number, enum: [1, 2], required: true },
        status: { type: String, enum: ["rejected", "snoozed"], required: true },
        resuggestAfter: { type: Date, default: null },
    },
    { timestamps: true }
);

MatchRecordSchema.index({ clientId: 1, candidateId: 1 }, { unique: true });
MatchRecordSchema.index({ clientId: 1 });

export function getMatchRecordModel(conn: Connection): Model<IMatchRecord> {
    return (
        (conn.models["MatchRecord"] as Model<IMatchRecord>) ||
        conn.model<IMatchRecord>("MatchRecord", MatchRecordSchema)
    );
}

const MatchRecordModel: Model<IMatchRecord> =
    mongoose.models.MatchRecord ||
    mongoose.model<IMatchRecord>("MatchRecord", MatchRecordSchema);

export default MatchRecordModel;
