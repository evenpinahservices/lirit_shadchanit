import mongoose, { Schema, Model } from "mongoose";

export interface FormToken {
    token: string;
    createdAt: Date;
    expiresAt: Date;
    usageCount: number;
    maxUsage: number;
    isActive: boolean;
}

const FormTokenSchema = new Schema<FormToken>(
    {
        token: { type: String, required: true, unique: true, index: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true, index: true },
        usageCount: { type: Number, default: 0 },
        maxUsage: { type: Number, default: 30 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

// TTL index to auto-delete expired tokens after 1 day past expiration
FormTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const FormTokenModel: Model<FormToken> = mongoose.models.FormToken || mongoose.model<FormToken>("FormToken", FormTokenSchema);

export default FormTokenModel;
