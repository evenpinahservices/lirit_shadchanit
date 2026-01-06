"use server";

import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary only if credentials are available
// Don't configure at module level to avoid crashes
let cloudinaryConfigured = false;

function ensureCloudinaryConfig() {
    if (cloudinaryConfigured) return;
    
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary credentials are not configured. Please check your .env.local file.");
    }
    
    try {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });
        cloudinaryConfigured = true;
    } catch (error) {
        console.error("Failed to configure Cloudinary:", error);
        throw new Error("Failed to configure Cloudinary. Please check your credentials.");
    }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

export async function uploadImage(formData: FormData): Promise<{ url: string | null; error: string | null }> {
    console.log("[uploadImage] Server action called");
    try {
        const file = formData.get("file") as File;
        if (!file) {
            console.warn("[uploadImage] No file provided for upload");
            return { url: null, error: "No file provided" };
        }
        
        console.log("[uploadImage] File received:", {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return { url: null, error: "Maximum upload size is 10 MB." };
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return { url: null, error: "File must be an image." };
        }

        // Configure Cloudinary (will throw if credentials are missing)
        try {
            ensureCloudinaryConfig();
        } catch (configError: any) {
            console.error("Cloudinary configuration error:", configError);
            return { url: null, error: configError.message || "Upload service configuration error. Please check Cloudinary credentials." };
        }

        // Process file with error handling for memory issues
        console.log("[uploadImage] Processing file...");
        let arrayBuffer: ArrayBuffer;
        try {
            arrayBuffer = await file.arrayBuffer();
            console.log("[uploadImage] File read successfully, size:", arrayBuffer.byteLength);
        } catch (err: any) {
            console.error("[uploadImage] Error reading file:", err);
            return { url: null, error: "Failed to read file. File may be corrupted." };
        }

        let buffer: Buffer;
        try {
            buffer = Buffer.from(arrayBuffer);
        } catch (err: any) {
            console.error("Error creating buffer:", err);
            return { url: null, error: "Failed to process file." };
        }

        // Upload to Cloudinary
        // For large files, we use base64 but with optimized settings
        console.log("[uploadImage] Uploading to Cloudinary...");
        try {
            // Convert buffer to base64 data URI
            // Note: Base64 increases size by ~33%, but Cloudinary handles this efficiently
            const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;
            
            const result = await Promise.race([
                cloudinary.uploader.upload(base64Data, {
                    folder: "shadchanit_clients",
                    resource_type: "image",
                    // Optimize for large files
                    chunk_size: 6000000, // 6MB chunks for large files
                    timeout: 120000, // 120 second timeout
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Upload timeout")), 120000) // 120 second timeout for large files
                )
            ]) as any;

            console.log("[uploadImage] Cloudinary upload successful");
            
            if (!result?.secure_url) {
                console.warn("[uploadImage] Upload succeeded but no URL returned");
                return { url: null, error: "Upload succeeded but no URL returned." };
            }

            console.log("[uploadImage] Upload complete, URL:", result.secure_url);
            return { url: result.secure_url, error: null };
        } catch (error: any) {
            console.error("Cloudinary upload failed:", error);
            // Provide more specific error message
            let errorMessage = "Upload failed. Please try again.";
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.error?.message) {
                errorMessage = error.error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            // Add helpful context
            if (errorMessage.includes("timeout")) {
                errorMessage = "Upload timed out. Please try a smaller file or check your internet connection.";
            } else if (errorMessage.includes("Invalid") || errorMessage.includes("invalid")) {
                errorMessage = "Invalid file format. Please upload a valid image file.";
            }

            return { url: null, error: errorMessage };
        }
    } catch (error: any) {
        // Catch any unexpected errors to prevent server crash
        console.error("[uploadImage] Unexpected error:", error);
        console.error("[uploadImage] Error stack:", error?.stack);
        console.error("[uploadImage] Error name:", error?.name);
        console.error("[uploadImage] Error message:", error?.message);
        
        // Ensure we always return a response, never throw
        return { 
            url: null, 
            error: error?.message || "An unexpected error occurred during upload. Please try again." 
        };
    }
}
