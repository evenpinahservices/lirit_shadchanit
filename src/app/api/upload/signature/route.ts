import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthAndRateLimit } from "@/lib/apiAuth";
import dbConnect from "@/lib/db";
import FormTokenModel from "@/models/FormToken";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Validate a form token without incrementing usage count
 * (Used for signature requests - we don't want to count each upload)
 */
async function validateFormToken(token: string): Promise<boolean> {
    await dbConnect();
    
    const tokenDoc = await FormTokenModel.findOne({ token, isActive: true });
    
    if (!tokenDoc) {
        return false;
    }
    
    // Check if expired
    if (new Date() > tokenDoc.expiresAt) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    
    // Check if usage limit exceeded
    if (tokenDoc.usageCount >= tokenDoc.maxUsage) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    
    // Token is valid (but we don't increment usage count here)
    return true;
}

export async function GET(request: NextRequest) {
    // Check if this is a form token request (for external form links)
    const token = request.nextUrl.searchParams.get("token");
    
    if (token) {
        // Validate form token (for external form links)
        const isValidToken = await validateFormToken(token);
        if (!isValidToken) {
            return NextResponse.json(
                { error: "Invalid or expired form token" },
                { status: 401 }
            );
        }
    } else {
        // Require regular authentication and rate limiting (100 requests per hour)
        const authResult = await requireAuthAndRateLimit(request, 100, 3600000);
        if ("error" in authResult) {
            return authResult.error;
        }
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

        // Return signature, timestamp, cloudName, folder, and apiKey
        // Note: apiKey is needed for direct Cloudinary uploads from client
        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
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




