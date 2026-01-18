import mongoose, { Schema, Model, Document } from "mongoose";

export interface ITwilioCost extends Document {
    messageSid: string; // Twilio message SID
    profileId?: string; // Related PendingClient ID
    sender: string; // WhatsApp sender number
    direction: "inbound" | "outbound";
    messageType: "text" | "media";
    cost: number; // Cost in USD
    currency: string; // e.g., "USD"
    date: Date;
    metadata?: {
        numMedia?: number;
        body?: string;
        status?: string;
    };
}

const TwilioCostSchema = new Schema<ITwilioCost>(
    {
        messageSid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        profileId: {
            type: String,
            index: true,
        },
        sender: {
            type: String,
            required: true,
            index: true,
        },
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            required: true,
        },
        messageType: {
            type: String,
            enum: ["text", "media"],
            required: true,
        },
        cost: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "USD",
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Index for querying costs by profile
TwilioCostSchema.index({ profileId: 1, date: -1 });

const TwilioCostModel: Model<ITwilioCost> =
    mongoose.models.TwilioCost || mongoose.model<ITwilioCost>("TwilioCost", TwilioCostSchema);

export default TwilioCostModel;
