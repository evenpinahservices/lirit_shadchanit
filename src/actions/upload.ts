"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(formData: FormData): Promise<string | null> {
    const file = formData.get("file") as File;
    if (!file) {
        console.warn("No file provided for upload");
        return null;
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn("Cloudinary env vars missing");
        return null;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;

        const result = await cloudinary.uploader.upload(base64Data, {
            folder: "shadchanit_clients",
            resource_type: "image",
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed", error);
        return null;
    }
}
