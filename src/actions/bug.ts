"use server";

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
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

        const id = bugReport._id.toString();

        // Write to local bug directory (skipped in serverless if not writable)
        try {
            const bugDir = path.join(process.cwd(), "bug", id);
            fs.mkdirSync(bugDir, { recursive: true });

            if (data.screenshotBase64) {
                const base64Data = data.screenshotBase64.includes(",")
                    ? data.screenshotBase64.split(",")[1]
                    : data.screenshotBase64;
                fs.writeFileSync(
                    path.join(bugDir, "screenshot.png"),
                    Buffer.from(base64Data!, "base64")
                );
            }

            const meta = bugReport.metadata as any;
            const reportJson = {
                id,
                description: bugReport.description,
                metadata: {
                    ...meta,
                    timestamp: meta?.timestamp instanceof Date ? meta.timestamp.toISOString() : meta?.timestamp,
                },
                status: bugReport.status,
                screenshotUrl: bugReport.screenshotUrl || undefined,
                createdAt: (bugReport as any).createdAt instanceof Date ? (bugReport as any).createdAt.toISOString() : (bugReport as any).createdAt,
            };
            fs.writeFileSync(
                path.join(bugDir, "report.json"),
                JSON.stringify(reportJson, null, 2),
                "utf-8"
            );
        } catch (dirErr) {
            console.warn("Could not write bug to local directory:", dirErr);
        }

        return { success: true, id };
    } catch (error: any) {
        console.error("Error submitting bug report:", error);
        return { success: false, error: error.message || "Failed to submit bug report" };
    }
}

export async function getBugReports(includeArchived: boolean = false): Promise<IBugReport[]> {
    try {
        await dbConnect();
        const query = includeArchived ? {} : { archived: { $ne: true } };
        const reports = await BugReport.find(query).sort({ createdAt: -1 }).lean();
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
        const updateData: any = { status };
        
        // Automatically archive when status is set to "resolved"
        if (status === "resolved") {
            updateData.archived = true;
            updateData.archivedAt = new Date();
        } else {
            // Unarchive if status is changed from resolved to something else
            updateData.archived = false;
            updateData.archivedAt = undefined;
        }
        
        await BugReport.findByIdAndUpdate(id, updateData);
        return { success: true };
    } catch (error) {
        console.error("Error updating bug report status:", error);
        return { success: false };
    }
}

export async function archiveBugReport(id: string): Promise<{ success: boolean }> {
    try {
        await dbConnect();
        await BugReport.findByIdAndUpdate(id, { 
            archived: true, 
            archivedAt: new Date() 
        });
        return { success: true };
    } catch (error) {
        console.error("Error archiving bug report:", error);
        return { success: false };
    }
}

export async function unarchiveBugReport(id: string): Promise<{ success: boolean }> {
    try {
        await dbConnect();
        await BugReport.findByIdAndUpdate(id, { 
            archived: false, 
            archivedAt: undefined 
        });
        return { success: true };
    } catch (error) {
        console.error("Error unarchiving bug report:", error);
        return { success: false };
    }
}
