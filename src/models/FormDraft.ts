import mongoose, { Schema, Model } from "mongoose";

export interface FormDraft {
    token: string;
    email?: string;
    phone?: string;
    formLanguage: "en" | "he";
    currentStep: number;
    data: Record<string, any>;
    lastSavedAt: Date;
    expiresAt: Date;
}

const FormDraftSchema = new Schema<FormDraft>(
    {
        token: { type: String, required: true, index: true },
        email: { type: String, sparse: true },
        phone: { type: String, sparse: true },
        formLanguage: { type: String, enum: ["en", "he"], default: "en" },
        currentStep: { type: Number, default: 0 },
        data: { type: Schema.Types.Mixed, default: {} },
        lastSavedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

// Query-performance indexes (not unique -- uniqueness is enforced by upsert filter logic)
FormDraftSchema.index({ email: 1 });
FormDraftSchema.index({ phone: 1 });

// TTL: auto-delete expired drafts
FormDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const FormDraftModel: Model<FormDraft> =
    mongoose.models.FormDraft || mongoose.model<FormDraft>("FormDraft", FormDraftSchema);

export default FormDraftModel;
