import mongoose, { Schema, Model } from "mongoose";
import { Client } from "@/lib/mockData";

const ClientSchema = new Schema<Client>(
    {
        fullName: { type: String, required: true },
        email: { type: String },
        phone: { type: String, required: true },
        dob: { type: String, required: true },
        location: { type: String },
        gender: { type: String, enum: ["Male", "Female"], required: true },

        // Appearance
        height: { type: String },
        eyeColor: { type: String },
        hairColor: { type: String },
        photoUrl: { type: String },

        // Background
        ethnicity: { type: String },
        tribalStatus: { type: String },
        religiousAffiliation: { type: [String], default: [] },
        learningStatus: { type: String },
        maritalStatus: { type: String },
        languages: { type: [String], default: [] },
        familyBackground: { type: String },
        education: { type: String },
        occupation: { type: String },
        smoking: { type: String },
        headCovering: { type: String },

        // Personal
        hobbies: { type: String },
        personality: { type: String },
        medicalHistory: { type: Boolean, default: false },
        medicalHistoryDetails: { type: String },

        // Preferences
        lookingFor: { type: String },
        willingToRelocate: { type: String },
        ageGapPreference: { type: [String], default: [] },
        preferredEthnicities: { type: [String], default: [] },
        preferredHashkafos: { type: [String], default: [] },
        preferredLearningStatus: { type: [String], default: [] },
        preferredHeadCovering: { type: [String], default: [] },

        // Meta
        references: { type: String },
        notes: { type: String },
        status: { type: String }, // Deprecated but kept for type signature
        createdAt: { type: String }, // Storing as string YYYY-MM-DD
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for 'id' to match our frontend interface which expects 'id' string, not '_id' object
ClientSchema.virtual('id').get(function () {
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


const ClientModel: Model<Client> = mongoose.models.Client || mongoose.model<Client>("Client", ClientSchema);

export default ClientModel;
