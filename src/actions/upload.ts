"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(base64Data: string): Promise<string | null> {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn("Cloudinary env vars missing");
        // Fallback: return the base64 string so it at least works (though bloats DB)
        // Or return null to fail gracefully. 
        // For now, let's return null to indicate upload failure but maybe we should allow base64 fallback for dev?
        // Let's return null and handle it.
        return null;
    }

    try {
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
