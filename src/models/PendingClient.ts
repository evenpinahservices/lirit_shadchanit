import mongoose, { Schema, Model, Connection } from "mongoose";
import { Client } from "@/lib/mockData";

// PendingClient interface extends Client with pending-specific fields
export interface PendingClient extends Client {
    submittedAt: string;
    submittedBy?: string; // Email or identifier of who submitted
    token?: string; // Token used for external form submission
    source?: "client_form" | "whatsapp" | "admin_manual" | "admin_ai_draft"; // Source of the submission
    sourceDescription?: string; // Human-readable description of the source
    existingApprovedClientId?: string; // ID of approved client that will be overwritten
}

const PendingClientSchema = new Schema<PendingClient>(
    {
        fullName: { type: String, required: true },
        email: { type: String },
        phone: { type: String },
        dob: { type: String, required: true },
        location: { type: String },
        locationEnglish: { type: String }, // Always English "City, Country" — used for matching
        gender: { type: String, enum: ["Male", "Female"], required: true },

        // Appearance
        height: { type: Number },
        eyeColor: { type: String },
        hairColor: { type: String },
        photoUrl: { type: String },
        galleryImages: { type: [String], default: [] },

        // Background
        ethnicity: { type: String },
        tribalStatus: { type: String },
        religiousAffiliation: { type: [String], default: [] },
        learningStatus: { type: String },
        headCovering: { type: String },
        religiousDetailsFreeText: { type: String },
        maritalStatus: { type: String },
        children: { type: Number, default: 0 },
        languages: { type: [String], default: [] },
        familyBackground: { type: String },
        education: { type: String },
        occupationTitle: { type: String },
        occupationDescription: { type: String },
        smoking: { type: String },

        // Personal
        hobbies: { type: String },
        personality: { type: String },
        medicalHistory: { type: Boolean, default: false },
        medicalHistoryDetails: { type: String },

        // Preferences
        willingToRelocate: { type: String },
        ageGapPreference: { type: [String], default: [] },
        preferredEthnicities: { type: [String], default: [] },
        preferredHashkafos: { type: [String], default: [] },
        preferredLearningStatus: { type: [String], default: [] },
        preferredHeadCovering: { type: [String], default: [] },
        preferencesFreeText: { type: String },

        // Meta
        references: { type: String },
        notes: { type: String },
        resumeRawText: { type: String },
        active: { type: Boolean, default: true },
        status: { type: String },
        formLanguage: { type: String, enum: ["en", "he"], default: "en" },
        createdAt: { type: String },
        
    // Pending-specific fields
    submittedAt: { type: String, required: true },
    submittedBy: { type: String },
    token: { type: String },
    source: { type: String, enum: ["client_form", "whatsapp", "admin_manual", "admin_ai_draft"], default: "admin_manual" },
    sourceDescription: { type: String },
    existingApprovedClientId: { type: String }, // ID of approved client that will be overwritten
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for common query patterns
PendingClientSchema.index({ status: 1, createdAt: -1 });
PendingClientSchema.index({ email: 1 });
PendingClientSchema.index({ phone: 1 });

// Virtual for 'id' to match our frontend interface
PendingClientSchema.virtual('id').get(function (this: any) {
    return this._id.toHexString();
});

// Ensure virtuals are included
PendingClientSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete (ret as any)._id;
    }
});

export function getPendingClientModel(conn: Connection): Model<PendingClient> {
    return (conn.models["PendingClient"] as Model<PendingClient>) || conn.model<PendingClient>("PendingClient", PendingClientSchema);
}

const PendingClientModel: Model<PendingClient> = mongoose.models.PendingClient || mongoose.model<PendingClient>("PendingClient", PendingClientSchema);

export default PendingClientModel;
