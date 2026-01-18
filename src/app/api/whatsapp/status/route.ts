import { NextRequest, NextResponse } from "next/server";

// Simple endpoint to check if webhook is working
// This doesn't expose sensitive data, just confirms the route is accessible
export async function GET(request: NextRequest) {
    return NextResponse.json({
        status: "WhatsApp webhook is active",
        endpoint: "/api/whatsapp/webhook",
        timestamp: new Date().toISOString(),
    });
}
