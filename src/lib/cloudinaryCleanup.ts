import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract Cloudinary public ID from URL
 * Example: https://res.cloudinary.com/cloud/image/upload/v1234567890/whatsapp_resumes/abc123.jpg
 * Returns: whatsapp_resumes/abc123
 */
function extractPublicId(url: string): string | null {
    try {
        // Cloudinary URLs have format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    } catch (error) {
        console.error("Error extracting public ID from URL:", url, error);
        return null;
    }
}

/**
 * Delete a single image from Cloudinary
 */
export async function deleteCloudinaryImage(url: string): Promise<boolean> {
    try {
        const publicId = extractPublicId(url);
        if (!publicId) {
            console.warn(`[Cloudinary] Could not extract public ID from URL: ${url}`);
            return false;
        }

        console.log(`[Cloudinary] Deleting image: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });

        if (result.result === "ok" || result.result === "not found") {
            console.log(`[Cloudinary] Successfully deleted: ${publicId}`);
            return true;
        } else {
            console.warn(`[Cloudinary] Failed to delete ${publicId}: ${result.result}`);
            return false;
        }
    } catch (error: any) {
        console.error(`[Cloudinary] Error deleting image ${url}:`, error.message);
        return false;
    }
}

/**
 * Delete multiple images from Cloudinary
 * Returns count of successfully deleted images
 */
export async function deleteCloudinaryImages(urls: string[]): Promise<number> {
    if (!urls || urls.length === 0) {
        return 0;
    }

    console.log(`[Cloudinary] Deleting ${urls.length} image(s)...`);
    let deletedCount = 0;

    // Delete in parallel (Cloudinary can handle this)
    const deletePromises = urls.map(url => deleteCloudinaryImage(url));
    const results = await Promise.allSettled(deletePromises);

    results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
            deletedCount++;
        } else {
            console.error(`[Cloudinary] Failed to delete image ${index + 1}:`, result.status === "rejected" ? result.reason : "unknown error");
        }
    });

    console.log(`[Cloudinary] Deleted ${deletedCount}/${urls.length} image(s)`);
    return deletedCount;
}

/**
 * Extract all image URLs from a client/pending client object
 */
export function extractImageUrls(client: any): string[] {
    const urls: string[] = [];

    // Profile photo
    if (client.photoUrl && typeof client.photoUrl === "string") {
        urls.push(client.photoUrl);
    }

    // Gallery images
    if (client.galleryImages && Array.isArray(client.galleryImages)) {
        client.galleryImages.forEach((url: string) => {
            if (url && typeof url === "string") {
                urls.push(url);
            }
        });
    }

    // Filter to only Cloudinary URLs (from whatsapp_resumes folder)
    return urls.filter(url => 
        url.includes("cloudinary.com") && 
        (url.includes("whatsapp_resumes") || url.includes("shadchanit_clients"))
    );
}
