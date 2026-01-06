"use client";

import { useState, useCallback } from "react";

interface UploadState {
    isUploading: boolean;
    progress: number; // 0-100
    error: string | null;
}

interface UploadResult {
    url: string | null;
    error: string | null;
}

interface SignatureResponse {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
}

const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useUploadWithProgress() {
    const [state, setState] = useState<UploadState>({
        isUploading: false,
        progress: 0,
        error: null,
    });

    const uploadWithProgress = useCallback(async (file: File): Promise<UploadResult> => {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
            const error = "Maximum upload size is 10 MB.";
            setState({ isUploading: false, progress: 0, error });
            return { url: null, error };
        }

        if (!file.type.startsWith("image/")) {
            const error = "File must be an image.";
            setState({ isUploading: false, progress: 0, error });
            return { url: null, error };
        }

        setState({ isUploading: true, progress: 0, error: null });

        try {
            // Get upload signature from our server
            const sigResponse = await fetch("/api/upload/signature");
            if (!sigResponse.ok) {
                throw new Error("Failed to get upload signature");
            }
            const sigData: SignatureResponse = await sigResponse.json();

            // Upload directly to Cloudinary with real progress tracking
            return new Promise((resolve) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("api_key", sigData.apiKey);
                formData.append("timestamp", sigData.timestamp.toString());
                formData.append("signature", sigData.signature);
                formData.append("folder", sigData.folder);

                const xhr = new XMLHttpRequest();

                // Track REAL upload progress to Cloudinary
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setState((prev) => ({ ...prev, progress: percentComplete }));
                    }
                });

                // Handle completion
                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.secure_url) {
                                setState({ isUploading: false, progress: 100, error: null });
                                resolve({ url: response.secure_url, error: null });
                            } else {
                                const error = response.error?.message || "Upload failed";
                                setState({ isUploading: false, progress: 0, error });
                                resolve({ url: null, error });
                            }
                        } catch {
                            setState({ isUploading: false, progress: 0, error: "Invalid response from Cloudinary" });
                            resolve({ url: null, error: "Invalid response from Cloudinary" });
                        }
                    } else {
                        let error = "Upload failed";
                        try {
                            const response = JSON.parse(xhr.responseText);
                            error = response.error?.message || error;
                        } catch {
                            // Keep default error
                        }
                        setState({ isUploading: false, progress: 0, error });
                        resolve({ url: null, error });
                    }
                });

                // Handle errors
                xhr.addEventListener("error", () => {
                    const error = "Network error during upload";
                    setState({ isUploading: false, progress: 0, error });
                    resolve({ url: null, error });
                });

                xhr.addEventListener("abort", () => {
                    const error = "Upload cancelled";
                    setState({ isUploading: false, progress: 0, error });
                    resolve({ url: null, error });
                });

                // Send directly to Cloudinary
                xhr.open("POST", `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`);
                xhr.send(formData);
            });
        } catch (error: any) {
            const errorMsg = error?.message || "Upload failed";
            setState({ isUploading: false, progress: 0, error: errorMsg });
            return { url: null, error: errorMsg };
        }
    }, []);

    const reset = useCallback(() => {
        setState({ isUploading: false, progress: 0, error: null });
    }, []);

    return {
        ...state,
        uploadWithProgress,
        reset,
        isLargeFile: (file: File) => file.size > LARGE_FILE_THRESHOLD,
    };
}

