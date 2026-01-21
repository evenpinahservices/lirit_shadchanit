import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthAndRateLimit } from "@/lib/apiAuth";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
    // Require authentication and rate limiting (100 requests per hour)
    const authResult = await requireAuthAndRateLimit(request, 100, 3600000);
    if ("error" in authResult) {
        return authResult.error;
    }
    
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        const paramsToSign = {
            timestamp,
            folder: "shadchanit_clients",
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        // Don't expose API keys - only return signature and public info
        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            folder: "shadchanit_clients",
        });
    } catch (error: any) {
        console.error("Signature generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload signature" },
            { status: 500 }
        );
    }
}




