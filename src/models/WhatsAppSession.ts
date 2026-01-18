import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppSession extends Document {
    sender: string;
    images: string[]; // Cloudinary URLs
    timestamp: number;
    createdAt: Date;
    expiresAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>({
    sender: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    images: {
        type: [String],
        default: [],
    },
    timestamp: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600, // Auto-delete after 1 hour
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        index: { expireAfterSeconds: 0 },
    },
});

// Only create model if it doesn't exist
const WhatsAppSessionModel =
    mongoose.models.WhatsAppSession ||
    mongoose.model<IWhatsAppSession>("WhatsAppSession", WhatsAppSessionSchema);

export default WhatsAppSessionModel;
