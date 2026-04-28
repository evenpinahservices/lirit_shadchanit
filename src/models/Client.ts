import mongoose, { Schema, Model, Connection } from "mongoose";
import { Client } from "@/lib/mockData";

const ClientSchema = new Schema<Client>(
    {
        fullName: { type: String, required: true },
        email: { type: String },
        phone: { type: String },
        dob: { type: String, required: true },
        location: { type: String },
        locationEnglish: { type: String }, // Always English "City, Country" — used for matching
        gender: { type: String, enum: ["Male", "Female"], required: true },

        // Appearance
        height: { type: Number }, // Changed to Number to match interface
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
        children: { type: Number, default: 0 }, // Added missing field
        languages: { type: [String], default: [] },
        familyBackground: { type: String },
        education: { type: String },
        occupationTitle: { type: String },
        occupationDescription: { type: String },
        smoking: { type: String },

        // Personal
        hobbies: { type: String }, // String field for hobbies
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
        active: { type: Boolean, default: true }, // Added missing field
        status: { type: String }, // Deprecated but kept for type signature
        clientStatus: { type: String, enum: ["active", "not_relevant", "remind_later"], default: "active" },
        formLanguage: { type: String, enum: ["en", "he"], default: "en" }, // Language the form was filled in
        createdAt: { type: String }, // Storing as string YYYY-MM-DD
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for 'id' to match our frontend interface which expects 'id' string, not '_id' object
ClientSchema.virtual('id').get(function (this: any) {
    return this._id.toHexString();
});

// Ensure virtuals are included
ClientSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete (ret as any)._id;
    }
});


export function getClientModel(conn: Connection): Model<Client> {
    return (conn.models["Client"] as Model<Client>) || conn.model<Client>("Client", ClientSchema);
}

const ClientModel: Model<Client> = mongoose.models.Client || mongoose.model<Client>("Client", ClientSchema);

export default ClientModel;
