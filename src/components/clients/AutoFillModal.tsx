"use client";

import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { extractTextFromImage, containsHebrew } from "@/lib/ocr";
import { translateHebrewToEnglish } from "@/actions/translate";
import { parseTextToClientData } from "@/lib/textParser";
import { useUploadWithProgress } from "@/hooks/useUploadWithProgress";
import { ErrorAlertModal } from "@/components/ui/ErrorAlertModal";
import { useBackgroundAiProgress } from "@/context/BackgroundAiProgressContext";
import { getFriendlyError } from "@/lib/errorMessages";
import type { FriendlyError } from "@/lib/errorMessages";
import Image from "next/image";

export interface AutoFillCompletePayload {
    formData: any;
    galleryUrls: string[];
    profilePhotoUrl: string | null;
}

interface AutoFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFillForm: (data: any) => void;
    onAddToGallery: (urls: string[]) => void;
    onSetProfilePhoto: (url: string) => void;
    /** When provided, called with full payload after AI success; then parent can create pending draft and redirect. Omits separate onFillForm/onAddToGallery/onSetProfilePhoto calls. */
    onComplete?: (payload: AutoFillCompletePayload) => void;
    fullScreen?: boolean;
}

export function AutoFillModal({
    isOpen,
    onClose,
    onFillForm,
    onAddToGallery,
    onSetProfilePhoto,
    onComplete,
    fullScreen = false,
}: AutoFillModalProps) {
    const [allImages, setAllImages] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>("");
    const [processingSubStatus, setProcessingSubStatus] = useState<string>("");
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [extractedText, setExtractedText] = useState<string>("");
    const [translatedText, setTranslatedText] = useState<string>("");
    const [selectedProfileIndex, setSelectedProfileIndex] = useState<number | null>(null);
    const [isDraggingImages, setIsDraggingImages] = useState(false);
    const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);

    const aiProgress = useBackgroundAiProgress();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortedRef = useRef(false);

    const updateProgress = (n: number) => {
        setProcessingProgress(n);
        aiProgress?.setProgress(n);
    };
    const updateStatus = (s: string) => {
        setProcessingStatus(s);
        aiProgress?.setStatus(s);
    };
    const updateSubStatus = (s: string) => {
        setProcessingSubStatus(s);
        aiProgress?.setSubStatus(s);
    };
    const startTimeRef = useRef<number | null>(null);
    
    const imageUpload = useUploadWithProgress();

    // Stop simulated progress on unmount only if processing is no longer active.
    // When the user minimizes, the context keeps the interval alive intentionally.
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        };
    }, []);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setAllImages(prev => [...prev, ...files]);
        }
        if (e.target) {
            e.target.value = "";
        }
    };

    const removeImage = (index: number) => {
        setAllImages(prev => prev.filter((_, i) => i !== index));
        if (selectedProfileIndex === index) {
            setSelectedProfileIndex(null);
        } else if (selectedProfileIndex !== null && selectedProfileIndex > index) {
            setSelectedProfileIndex(selectedProfileIndex - 1);
        }
    };

    const handleImageDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDraggingImages(false);
        
        if (isProcessing) return;
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
        if (files.length > 0) {
            setAllImages(prev => [...prev, ...files]);
        }
    };

    const processImages = async () => {
        if (allImages.length === 0) {
            setFriendlyError(getFriendlyError("Please upload at least one image", "process-images"));
            return;
        }

        setIsProcessing(true);
        aiProgress?.setProcessing(true);
        abortedRef.current = false;
        const abortController = new AbortController();
        aiProgress?.setCancelCallback?.(() => {
            abortedRef.current = true;
            abortController.abort();
        });
        updateProgress(0);
        aiProgress?.setProgress(0);
        const t0 = Date.now();
        startTimeRef.current = t0;
        console.log("[AutoFill] ▶ started", new Date().toLocaleTimeString());

        // Clear any local interval (context manages the simulated progress interval)
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        aiProgress?.stopSimulatedProgress();
        
        try {
            const allGalleryUrls: string[] = [];
            let profilePhotoUrl: string | null = null;

            // Step 1: Upload all images to gallery first (for storage) - 0-15%
            updateStatus("Uploading images");
            updateSubStatus("Preparing images for upload...");
            updateProgress(2);

            const totalImages = allImages.length;
            console.log(`[AutoFill] uploading ${totalImages} image(s) to Cloudinary in parallel…`);
            const tUploadStart = Date.now();
            let completedUploads = 0;

            updateSubStatus(`Uploading ${totalImages} image${totalImages > 1 ? "s" : ""} in parallel…`);

            // Upload all images simultaneously — each call fetches its own
            // Cloudinary signature, so they are fully independent.
            const uploadResults = await Promise.all(
                allImages.map(async (file, i) => {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                    console.log(`[AutoFill]   image ${i + 1}/${totalImages} starting — ${sizeMB} MB`);
                    const tImg = Date.now();
                    const result = await imageUpload.uploadWithProgress(file);
                    const elapsed = ((Date.now() - tImg) / 1000).toFixed(1);
                    console.log(`[AutoFill]   image ${i + 1}/${totalImages} done in ${elapsed}s${result.error ? ` ❌ ${result.error}` : ""}`);
                    completedUploads++;
                    updateSubStatus(`Uploading… ${completedUploads}/${totalImages} done`);
                    updateProgress(2 + (completedUploads / totalImages) * 13);
                    return { result, index: i };
                })
            );

            if (abortedRef.current) throw new DOMException("Cancelled", "AbortError");

            console.log(`[AutoFill] all uploads done in ${((Date.now() - tUploadStart) / 1000).toFixed(1)}s`);

            // Collect URLs preserving original image order (Promise.all keeps order).
            for (const { result, index } of uploadResults) {
                if (result.url) {
                    allGalleryUrls.push(result.url);
                    if (selectedProfileIndex === index || (selectedProfileIndex === null && index === 0)) {
                        profilePhotoUrl = result.url;
                    }
                }
            }

            if (abortedRef.current) {
                throw new DOMException("Cancelled", "AbortError");
            }

            // Step 2: Prepare for AI - send all uploaded image URLs (API fetches server-side to avoid 413)
            updateStatus("Processing with AI");
            updateSubStatus("Preparing images for AI analysis...");
            updateProgress(15);
            await new Promise(resolve => setTimeout(resolve, 300));
            updateProgress(18);

            if (allGalleryUrls.length === 0) {
                throw new Error("No image URLs available for extraction. Upload may have failed.");
            }

            updateProgress(20);
            updateSubStatus(`Sending ${allGalleryUrls.length} image${allGalleryUrls.length > 1 ? "s" : ""} to AI model...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            updateSubStatus("Querying Gemini AI...");
            await new Promise(resolve => setTimeout(resolve, 200));

            // Delegate the smooth progress animation to the context so it
            // survives if the user minimizes (which unmounts this component).
            // 120 s estimate; the context enters slow-creep mode past that.
            const estimatedAiDuration = 120000;
            aiProgress?.startSimulatedProgress(20, 90, estimatedAiDuration);

            // Keep substatus updated with elapsed seconds so the user can see
            // the AI call is still active even when the progress bar slows down.
            const tGeminiStart = Date.now();
            console.log(`[AutoFill] ▶ Gemini API call started (${allGalleryUrls.length} image(s))`);
            const elapsedInterval = setInterval(() => {
                const secs = Math.round((Date.now() - tGeminiStart) / 1000);
                updateSubStatus(`AI is analyzing ${allGalleryUrls.length} image${allGalleryUrls.length > 1 ? "s" : ""}… (${secs}s)`);
            }, 1000);
            progressIntervalRef.current = elapsedInterval;

            let response: Response;
            try {
                response = await fetch("/api/extract-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageUrls: allGalleryUrls }),
                    credentials: "include",
                    signal: abortController.signal,
                });
            } catch (fetchError: any) {
                clearInterval(elapsedInterval);
                progressIntervalRef.current = null;
                if (fetchError?.name === "AbortError") throw fetchError;
                console.error("[AutoFill] Fetch error:", fetchError);
                aiProgress?.stopSimulatedProgress();
                throw new Error(`Network error: ${fetchError.message || "Failed to connect to server"}`);
            }

            clearInterval(elapsedInterval);
            progressIntervalRef.current = null;
            const geminiMs = Date.now() - tGeminiStart;
            console.log(`[AutoFill] ◀ Gemini responded in ${(geminiMs / 1000).toFixed(1)}s — status ${response.status}`);

            // Stop the simulated progress animation now that we have a real response.
            aiProgress?.stopSimulatedProgress();
            
            updateProgress(90);
            updateSubStatus("Received AI response, processing...");
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (!response.ok) {
                let errorMessage = "Failed to extract data from images";
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.error || errorMessage;
                    
                    // Provide more helpful message for authentication errors
                    if (response.status === 401 || errorMessage.includes("Unauthorized") || errorMessage.includes("Authentication required")) {
                        errorMessage = "Your session has expired. Redirecting to login...";
                        window.dispatchEvent(new CustomEvent("session-expired"));
                    }
                    
                    if (errorData.details) {
                        console.error("API error details:", errorData.details);
                    }
                } catch {
                    if (response.status === 401) {
                        errorMessage = "Your session has expired. Redirecting to login...";
                        window.dispatchEvent(new CustomEvent("session-expired"));
                    } else {
                        errorMessage = `Server error (${response.status}): ${text.substring(0, 200)}`;
                    }
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || "Data extraction failed");
            }
            
            // Step 4: Process AI response - 90-100%
            updateSubStatus("Extracting details from images...");
            updateProgress(92);
            
            const extractedData = result.data;
            
            // Step 5: Verify and validate
            updateSubStatus("Verifying and confirming information...");
            updateProgress(94);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            updateSubStatus("Measuring confidence levels...");
            updateProgress(96);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Step 6: Format data for form
            updateSubStatus("Formatting extracted data...");
            updateProgress(97);
            
            // The extracted data should preserve the nested structure {value, confidence, sourceQuote}
            // This allows the form to extract confidence for color coding
            const finalFormData: any = {
                ...extractedData,
            };
            
            // For nested structures, ensure arrays are properly formatted in the value
            // But preserve the confidence data
            const processNestedArray = (fieldData: any, fieldName: string) => {
                if (!fieldData) return;
                
                // If it's a nested structure {value, confidence, sourceQuote}
                if (typeof fieldData === "object" && "value" in fieldData) {
                    const value = fieldData.value;
                    if (value && !Array.isArray(value)) {
                        // Convert string to array if needed
                        if (typeof value === "string") {
                            finalFormData[fieldName] = {
                                ...fieldData,
                                value: value.split(",").map((s: string) => s.trim()).filter(Boolean)
                            };
                        } else {
                            finalFormData[fieldName] = {
                                ...fieldData,
                                value: [value]
                            };
                        }
                    }
                }
                // If it's already a simple value, convert to array
                else if (fieldData && !Array.isArray(fieldData)) {
                    if (typeof fieldData === "string") {
                        finalFormData[fieldName] = {
                            value: fieldData.split(",").map((s: string) => s.trim()).filter(Boolean),
                            confidence: undefined,
                            sourceQuote: null
                        };
                    } else {
                        finalFormData[fieldName] = {
                            value: [fieldData],
                            confidence: undefined,
                            sourceQuote: null
                        };
                    }
                }
            };
            
            // Process array fields while preserving confidence structure
            if (finalFormData.religiousAffiliation) {
                processNestedArray(finalFormData.religiousAffiliation, "religiousAffiliation");
            }
            if (finalFormData.languages) {
                processNestedArray(finalFormData.languages, "languages");
            }
            if (finalFormData.ageGapPreference) {
                processNestedArray(finalFormData.ageGapPreference, "ageGapPreference");
            }
            if (finalFormData.preferredEthnicities) {
                processNestedArray(finalFormData.preferredEthnicities, "preferredEthnicities");
            }
            if (finalFormData.preferredHashkafos) {
                processNestedArray(finalFormData.preferredHashkafos, "preferredHashkafos");
            }
            if (finalFormData.preferredLearningStatus) {
                processNestedArray(finalFormData.preferredLearningStatus, "preferredLearningStatus");
            }
            if (finalFormData.preferredHeadCovering) {
                processNestedArray(finalFormData.preferredHeadCovering, "preferredHeadCovering");
            }
            
            // Store raw text if available (preserve structure if it exists)
            if (extractedData.resumeRawText) {
                if (typeof extractedData.resumeRawText === "object" && "value" in extractedData.resumeRawText) {
                    finalFormData.resumeRawText = extractedData.resumeRawText;
                } else {
                    finalFormData.resumeRawText = {
                        value: extractedData.resumeRawText,
                        confidence: 1.0,
                        sourceQuote: "Full extracted text from images"
                    };
                }
            }
            
            // Step 7: Populate form
            updateSubStatus("Populating form fields...");
            updateProgress(99);
            // DEBUG: What we're sending to the form (check Console, filter "Age/DOB")
            const fdAge = finalFormData?.age?.value ?? finalFormData?.age;
            const fdDob = finalFormData?.dob?.value ?? finalFormData?.dob;
            console.log("[Age/DOB debug] AutoFillModal passing to form:", { age: fdAge, dob: fdDob });
            // When onComplete is provided (AI → draft flow), call it with full payload; otherwise call legacy callbacks
            if (onComplete) {
                onComplete({
                    formData: finalFormData,
                    galleryUrls: allGalleryUrls,
                    profilePhotoUrl,
                });
            } else {
                onFillForm(finalFormData);
                if (allGalleryUrls.length > 0) {
                    onAddToGallery(allGalleryUrls);
                }
                if (profilePhotoUrl) {
                    onSetProfilePhoto(profilePhotoUrl);
                }
            }

            console.log(`[AutoFill] ✓ done — total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
            updateStatus("Complete!");
            updateSubStatus(onComplete ? "Creating draft..." : "Form has been populated successfully!");
            updateProgress(100);
            
            setTimeout(() => {
                setAllImages([]);
                setExtractedText("");
                setTranslatedText("");
                setSelectedProfileIndex(null);
                updateSubStatus("");
                updateProgress(0);
                startTimeRef.current = null;
                if (!onComplete) {
                    // Legacy: modal closes when parent switches to form
                }
            }, onComplete ? 500 : 1500);
        } catch (error: any) {
            if (error?.name === "AbortError") {
                // User cancelled - no error message
            } else {
                console.error("Processing error:", error);
                setFriendlyError(getFriendlyError(error, "process-images"));
            }
            // Clear interval on error
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        } finally {
            aiProgress?.setCancelCallback?.(null);
            setIsProcessing(false);
            aiProgress?.setProcessing(false);
            updateStatus("");
            // Clear interval
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            onClose();
            setAllImages([]);
            setExtractedText("");
            setTranslatedText("");
            setSelectedProfileIndex(null);
        }
    };

    if (fullScreen) {
        return (
            <>
                <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col" dir="ltr">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-semibold">Auto-Fill from Images</h2>
                        <button
                            onClick={handleClose}
                            disabled={isProcessing}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Images Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-medium">Upload Images</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Upload all images (resumes, forms, profile pictures, etc.). Select one image to use as the main profile photo. All images will be added to the gallery and processed by AI.
                            </p>
                            
                            <div className="grid grid-cols-3 gap-3 max-w-[min(56rem,100%)] max-h-[min(60vh,600px)] overflow-y-auto">
                                {allImages.map((file, index) => (
                                    <div
                                        key={index}
                                        className={`relative aspect-square rounded-md overflow-hidden border-2 min-w-0 ${
                                            selectedProfileIndex === index
                                                ? 'border-blue-500'
                                                : 'border-gray-300'
                                        }`}
                                    >
                                        <Image
                                            src={URL.createObjectURL(file)}
                                            alt={`Image ${index + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                        {selectedProfileIndex === index && (
                                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Main Photo</span>
                                            </div>
                                        )}
                                        <div className="absolute top-1 right-1 flex gap-1">
                                            <button
                                                onClick={() => setSelectedProfileIndex(index)}
                                                disabled={isProcessing}
                                                className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 disabled:opacity-50"
                                                title="Set as main photo"
                                            >
                                                <ImageIcon className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => removeImage(index)}
                                                disabled={isProcessing}
                                                className="bg-danger-500 text-white rounded-full p-1 hover:bg-danger-600 disabled:opacity-50"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <label
                                    className={`relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed cursor-pointer bg-gray-50 dark:bg-gray-800 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${
                                        isDraggingImages 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}
                                    onDrop={handleImageDrop}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (!isProcessing) {
                                            setIsDraggingImages(true);
                                        }
                                    }}
                                    onDragLeave={() => setIsDraggingImages(false)}
                                >
                                    <UploadCloud className="h-6 w-6 text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-1">
                                        {isDraggingImages ? "Drop images here" : "Add Images"}
                                    </span>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isProcessing}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Processing Status */}
                        {isProcessing && (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                <span className="text-sm text-blue-700 dark:text-blue-300">{processingStatus}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 p-4 pb-20 md:pb-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex gap-3 ml-auto">
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processImages}
                                disabled={isProcessing || allImages.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Process & Fill Form"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <ErrorAlertModal
                    isOpen={!!friendlyError}
                    onClose={() => setFriendlyError(null)}
                    error={friendlyError}
                />
            </>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" dir="ltr">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="ltr">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-xl font-semibold">Auto-Fill from Images</h2>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Images Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-medium">Upload Images</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Upload all images (resumes, forms, profile pictures, etc.). Select one image to use as the main profile photo. All images will be added to the gallery and processed by AI.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3 max-w-[min(56rem,100%)] max-h-[min(60vh,600px)] overflow-y-auto">
                            {allImages.map((file, index) => (
                                <div
                                    key={index}
                                    className={`relative aspect-square rounded-md overflow-hidden border-2 min-w-0 ${
                                        selectedProfileIndex === index
                                            ? 'border-blue-500'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    <Image
                                        src={URL.createObjectURL(file)}
                                        alt={`Image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    {selectedProfileIndex === index && (
                                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Main Photo</span>
                                        </div>
                                    )}
                                    <div className="absolute top-1 right-1 flex gap-1">
                                        <button
                                            onClick={() => setSelectedProfileIndex(index)}
                                            disabled={isProcessing}
                                            className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 disabled:opacity-50"
                                            title="Set as main photo"
                                        >
                                            <ImageIcon className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => removeImage(index)}
                                            disabled={isProcessing}
                                            className="bg-danger-500 text-white rounded-full p-1 hover:bg-danger-600 disabled:opacity-50"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <label
                                className={`relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed cursor-pointer bg-gray-50 dark:bg-gray-800 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${
                                    isDraggingImages 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                                style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}
                                onDrop={handleImageDrop}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!isProcessing) {
                                        setIsDraggingImages(true);
                                    }
                                }}
                                onDragLeave={() => setIsDraggingImages(false)}
                            >
                                <UploadCloud className="h-6 w-6 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">
                                    {isDraggingImages ? "Drop images here" : "Add Images"}
                                </span>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Processing Status */}
                    {isProcessing && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">{processingStatus}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 pb-20 md:pb-4">
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={processImages}
                            disabled={isProcessing || allImages.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Process & Fill Form"
                            )}
                        </button>
                    </div>
                </div>
                </div>
            </div>
            <ErrorAlertModal
                isOpen={!!friendlyError}
                onClose={() => setFriendlyError(null)}
                error={friendlyError}
            />
        </>
    );
}

