"use server";

import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import BugReport, { IBugReport } from "@/models/BugReport";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface BugReportData {
    screenshotBase64?: string | null;
    description: string;
    metadata: {
        timestamp: string;
        pathname: string;
        userAgent: string;
        viewport: { width: number; height: number };
        screenResolution: { width: number; height: number };
        userName: string;
        userRole: string;
    };
}

export async function submitBugReport(data: BugReportData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        await dbConnect();

        // Upload screenshot to Cloudinary if provided
        let screenshotUrl = "";
        if (data.screenshotBase64) {
            const uploadResult = await cloudinary.uploader.upload(data.screenshotBase64, {
                folder: "bug-reports",
                resource_type: "image",
            });
            screenshotUrl = uploadResult.secure_url;
        }

        // Create bug report in MongoDB
        const bugReport = await BugReport.create({
            screenshotUrl,
            description: data.description,
            metadata: {
                ...data.metadata,
                timestamp: new Date(data.metadata.timestamp),
            },
            status: "new",
        });

        return { success: true, id: bugReport._id.toString() };
    } catch (error: any) {
        console.error("Error submitting bug report:", error);
        return { success: false, error: error.message || "Failed to submit bug report" };
    }
}

export async function getBugReports(): Promise<IBugReport[]> {
    try {
        await dbConnect();
        const reports = await BugReport.find().sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(reports));
    } catch (error) {
        console.error("Error fetching bug reports:", error);
        return [];
    }
}

export async function updateBugReportStatus(
    id: string,
    status: "new" | "reviewed" | "resolved"
): Promise<{ success: boolean }> {
    try {
        await dbConnect();
        await BugReport.findByIdAndUpdate(id, { status });
        return { success: true };
    } catch (error) {
        console.error("Error updating bug report status:", error);
        return { success: false };
    }
}
