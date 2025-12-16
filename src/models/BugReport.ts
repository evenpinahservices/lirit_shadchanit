import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBugReport extends Document {
    screenshotUrl?: string;
    description: string;
    metadata: {
        timestamp: Date;
        pathname: string;
        userAgent: string;
        viewport: { width: number; height: number };
        screenResolution: { width: number; height: number };
        userName: string;
        userRole: string;
    };
    status: "new" | "reviewed" | "resolved";
    createdAt: Date;
    updatedAt: Date;
}

const BugReportSchema = new Schema<IBugReport>(
    {
        screenshotUrl: { type: String, required: false },
        description: { type: String, required: true },
        metadata: {
            timestamp: { type: Date, required: true },
            pathname: { type: String, required: true },
            userAgent: { type: String, required: true },
            viewport: {
                width: { type: Number, required: true },
                height: { type: Number, required: true },
            },
            screenResolution: {
                width: { type: Number, required: true },
                height: { type: Number, required: true },
            },
            userName: { type: String, required: true },
            userRole: { type: String, required: true },
        },
        status: {
            type: String,
            enum: ["new", "reviewed", "resolved"],
            default: "new",
        },
    },
    { timestamps: true }
);

const BugReport: Model<IBugReport> =
    mongoose.models.BugReport || mongoose.model<IBugReport>("BugReport", BugReportSchema);

export default BugReport;
