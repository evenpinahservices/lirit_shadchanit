import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// Send notification to admin when client approves
export async function POST(request: NextRequest) {
    try {
        const { name, link } = await request.json();

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const adminNumber = process.env.ADMIN_NUMBER || "whatsapp:+972500000000";
        const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

        if (!accountSid || !authToken) {
            throw new Error("Twilio credentials not configured");
        }

        const client = twilio(accountSid, authToken);

        const message = await client.messages.create({
            from,
            to: adminNumber,
            body: `🔔 *New Client Pending Approval*\n\nName: ${name}\n\nReview here: ${link}`,
        });

        return NextResponse.json({ status: "Notification sent", messageId: message.sid });
    } catch (error: any) {
        console.error("Error sending notification:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send notification" },
            { status: 500 }
        );
    }
}
