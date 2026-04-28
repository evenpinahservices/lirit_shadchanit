import mongoose, { Schema, Model } from "mongoose";

export interface AuditLogEntry {
    action: "impersonation_start" | "impersonation_stop";
    actorId: string;
    actorUsername: string;
    targetId?: string;
    targetUsername?: string;
    ip?: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogEntry>(
    {
        action: { type: String, required: true, enum: ["impersonation_start", "impersonation_stop"] },
        actorId: { type: String, required: true, index: true },
        actorUsername: { type: String, required: true },
        targetId: { type: String },
        targetUsername: { type: String },
        ip: { type: String },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

// Auto-expire audit logs after 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLogModel: Model<AuditLogEntry> =
    mongoose.models.AuditLog || mongoose.model<AuditLogEntry>("AuditLog", AuditLogSchema);

export default AuditLogModel;
