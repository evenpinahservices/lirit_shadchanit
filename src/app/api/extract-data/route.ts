import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        
        // Get resume images and profile image from form data
        const resumeImages = formData.getAll("resume_images") as File[];
        const profileImage = formData.get("profile_image") as File | null;
        
        if (!resumeImages || resumeImages.length === 0) {
            return NextResponse.json(
                { error: "At least one resume image is required" },
                { status: 400 }
            );
        }
        
        // Create new FormData for FastAPI
        const fastApiFormData = new FormData();
        
        // Add resume images
        for (const img of resumeImages) {
            fastApiFormData.append("resume_images", img);
        }
        
        // Add profile image if provided
        if (profileImage) {
            fastApiFormData.append("profile_image", profileImage);
        }
        
        // Call FastAPI service
        const response = await fetch(`${FASTAPI_URL}/api/extract-client-data`, {
            method: "POST",
            body: fastApiFormData,
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI error:", errorText);
            return NextResponse.json(
                { error: `FastAPI service error: ${errorText}` },
                { status: response.status }
            );
        }
        
        const data = await response.json();
        return NextResponse.json(data);
        
    } catch (error: any) {
        console.error("Error in extract-data route:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to extract data" },
            { status: 500 }
        );
    }
}

