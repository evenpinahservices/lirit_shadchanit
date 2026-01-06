import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
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

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "File must be an image." }, { status: 400 });
        }

        // Convert to buffer and base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
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

// Configure the route to handle larger files
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "15mb",
        },
    },
};

