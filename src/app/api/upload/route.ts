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
        
        // Magic-byte validation. Read 12 bytes to cover WEBP (needs bytes 8-11 = "WEBP").
        const header = Array.from(buffer.slice(0, 12));
        const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
        const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E &&
                       header[3] === 0x47 && header[4] === 0x0D && header[5] === 0x0A &&
                       header[6] === 0x1A && header[7] === 0x0A;
        const isGif  = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 &&
                       header[3] === 0x38 && (header[4] === 0x37 || header[4] === 0x39) &&
                       header[5] === 0x61;
        // WEBP: first 4 bytes = RIFF, bytes 8-11 = WEBP
        const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 &&
                       header[3] === 0x46 && header[8] === 0x57 && header[9] === 0x45 &&
                       header[10] === 0x42 && header[11] === 0x50;

        if (!isJpeg && !isPng && !isGif && !isWebp) {
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




