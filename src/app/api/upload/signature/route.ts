import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthAndRateLimit } from "@/lib/apiAuth";
import dbConnect from "@/lib/db";
import FormTokenModel from "@/models/FormToken";
import UserModel from "@/models/User";

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
    const token = request.nextUrl.searchParams.get("token");
    let ownerUsername: string | undefined;

    if (token) {
        const isValidToken = await validateFormToken(token);
        if (!isValidToken) {
            return NextResponse.json(
                { error: "Invalid or expired form token" },
                { status: 401 }
            );
        }
        // Resolve the folder from the form token's ownerUsername
        await dbConnect();
        const tokenDoc = await FormTokenModel.findOne({ token }).lean();
        ownerUsername = (tokenDoc as any)?.ownerUsername || undefined;
    } else {
        const authResult = await requireAuthAndRateLimit(request, 100, 3600000);
        if ("error" in authResult) {
            return authResult.error;
        }
        ownerUsername = (authResult as { user: any }).user?.username;
    }

    const folder = ownerUsername
        ? `shadchanit_clients/${ownerUsername}`
        : "shadchanit_clients";

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);

        const paramsToSign = { timestamp, folder };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder,
        });
    } catch (error: any) {
        console.error("Signature generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload signature" },
            { status: 500 }
        );
    }
}




