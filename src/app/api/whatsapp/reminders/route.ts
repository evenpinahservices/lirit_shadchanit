import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/db";
import PendingClientModel from "@/models/PendingClient";

// Send daily reminders about pending clients
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const pendingCount = await PendingClientModel.countDocuments({
            status: "pending_approval",
        });

        if (pendingCount === 0) {
            return NextResponse.json({ status: "No reminders needed", pending_count: 0 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const adminNumber = process.env.ADMIN_NUMBER || "whatsapp:+972500000000";
        const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

        if (!accountSid || !authToken) {
            throw new Error("Twilio credentials not configured");
        }

        const client = twilio(accountSid, authToken);

        // High urgency vs low urgency
        const isHighUrgency = pendingCount > 10;

        let message: string;
        if (isHighUrgency) {
            message = `🔥 *Urgent Attention Needed*\n\nYou have ${pendingCount} profiles waiting for approval! The queue is getting full.`;
        } else {
            message = `👋 Just a reminder: You have ${pendingCount} profile(s) waiting for review.`;
        }

        const twilioMessage = await client.messages.create({
            from,
            to: adminNumber,
            body: message,
        });

        return NextResponse.json({
            status: "Reminder check complete",
            pending_count: pendingCount,
            messageId: twilioMessage.sid,
        });
    } catch (error: any) {
        console.error("Error in reminders endpoint:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check reminders" },
            { status: 500 }
        );
    }
}
