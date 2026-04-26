import mongoose, { Schema, Model } from "mongoose";

export interface InviteToken {
    token: string;
    createdBy: mongoose.Types.ObjectId;
    expiresAt: Date;
    usedAt?: Date;
    usedBy?: mongoose.Types.ObjectId;
}

const InviteTokenSchema = new Schema<InviteToken>(
    {
        token: { type: String, required: true, unique: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date },
        usedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

InviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const InviteTokenModel: Model<InviteToken> =
    mongoose.models.InviteToken || mongoose.model<InviteToken>("InviteToken", InviteTokenSchema);

export default InviteTokenModel;
