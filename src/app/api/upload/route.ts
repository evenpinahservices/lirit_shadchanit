import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthAndRateLimit } from "@/lib/apiAuth";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
    // Require authentication and rate limiting (50 uploads per hour)
    const authResult = await requireAuthAndRateLimit(request, 50, 3600000);
    if ("error" in authResult) {
        return authResult.error;
    }
    
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Maximum upload size is 10 MB." }, { status: 400 });
        }

        // Validate file type by MIME type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "File must be an image." }, { status: 400 });
        }

        // Convert to buffer and base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Basic file signature validation (magic bytes)
        // Check first few bytes to verify it's actually an image
        const allowedSignatures = [
            [0xFF, 0xD8, 0xFF], // JPEG
            [0x89, 0x50, 0x4E, 0x47], // PNG
            [0x47, 0x49, 0x46, 0x38], // GIF
            [0x52, 0x49, 0x46, 0x46], // WEBP (RIFF)
        ];
        
        const fileSignature = Array.from(buffer.slice(0, 4));
        const isValidImage = allowedSignatures.some(sig => 
            sig.every((byte, index) => fileSignature[index] === byte)
        );
        
        if (!isValidImage) {
            return NextResponse.json({ error: "Invalid image file format." }, { status: 400 });
        }
        const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Data, {
            folder: "shadchanit_clients",
            resource_type: "image",
            timeout: 120000,
        });

        if (!result?.secure_url) {
            return NextResponse.json({ error: "Upload succeeded but no URL returned." }, { status: 500 });
        }

        return NextResponse.json({ url: result.secure_url });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error?.message || "Upload failed. Please try again." },
            { status: 500 }
        );
    }
}




