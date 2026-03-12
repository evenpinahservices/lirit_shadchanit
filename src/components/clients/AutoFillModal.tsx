"use client";

import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { extractTextFromImage, containsHebrew } from "@/lib/ocr";
import { translateHebrewToEnglish } from "@/actions/translate";
import { parseTextToClientData } from "@/lib/textParser";
import { useUploadWithProgress } from "@/hooks/useUploadWithProgress";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ProgressOverlay } from "./ProgressOverlay";
import Image from "next/image";

interface AutoFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFillForm: (data: any) => void;
    onAddToGallery: (urls: string[]) => void;
    onSetProfilePhoto: (url: string) => void;
    fullScreen?: boolean;
}

export function AutoFillModal({
    isOpen,
    onClose,
    onFillForm,
    onAddToGallery,
    onSetProfilePhoto,
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
    
    const imageInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    
    const imageUpload = useUploadWithProgress();

    // Cleanup interval on unmount - MUST be before any early returns
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
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
            alert("Please upload at least one image");
            return;
        }

        setIsProcessing(true);
        setProcessingProgress(0);
        startTimeRef.current = Date.now();
        
        // Clear any existing interval
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        
        try {
            const allGalleryUrls: string[] = [];
            let profilePhotoUrl: string | null = null;

            // Step 1: Upload all images to gallery first (for storage) - 0-15%
            setProcessingStatus("Uploading images");
            setProcessingSubStatus("Preparing images for upload...");
            setProcessingProgress(2);
            
            const totalImages = allImages.length;
            const uploadProgressPerImage = 13 / totalImages; // 13% total for uploads (2% to 15%)
            
            // Upload all images
            for (let i = 0; i < allImages.length; i++) {
                const file = allImages[i];
                setProcessingSubStatus(`Uploading image ${i + 1} of ${allImages.length}...`);
                
                const uploadResult = await imageUpload.uploadWithProgress(file);
                if (uploadResult.url) {
                    allGalleryUrls.push(uploadResult.url);
                    
                    // Set selected profile photo (first image if none selected, or the selected one)
                    if (selectedProfileIndex === i || (selectedProfileIndex === null && i === 0)) {
                        profilePhotoUrl = uploadResult.url;
                    }
                }
                
                // Update progress based on upload completion
                setProcessingProgress(2 + (i + 1) * uploadProgressPerImage);
            }

            // Step 2: Prepare images for AI processing - 15-20%
            setProcessingStatus("Processing with AI");
            setProcessingSubStatus("Compressing and preparing images for AI analysis...");
            setProcessingProgress(15);
            await new Promise(resolve => setTimeout(resolve, 300));
            setProcessingProgress(18);
            
            const formData = new FormData();
            
            // Add all images as resume_images (for AI processing)
            for (const img of allImages) {
                formData.append("resume_images", img);
            }
            
            // Add selected profile image (only one - the main one)
            const mainProfileImage = selectedProfileIndex !== null 
                ? allImages[selectedProfileIndex]
                : allImages[0];
            formData.append("profile_image", mainProfileImage);
            
            setProcessingProgress(20);
            
            // Step 3: Query AI - 20-90% (time-based estimation)
            setProcessingSubStatus("Sending images to AI model...");
            await new Promise(resolve => setTimeout(resolve, 200));
            
            setProcessingSubStatus("Querying Gemini AI...");
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Start time-based progress tracking for AI processing
            const aiStartTime = Date.now();
            const estimatedAiDuration = 60000; // 60 seconds average
            let aiProgressInterval: NodeJS.Timeout | null = null;
            
            // Update progress every 100ms during AI processing
            aiProgressInterval = setInterval(() => {
                const elapsed = Date.now() - aiStartTime;
                // Use exponential easing - slower at start, faster as we approach completion
                const progressRatio = Math.min(elapsed / estimatedAiDuration, 0.95); // Cap at 95% until response received
                // Exponential easing: faster progress as time goes on
                const easedProgress = 1 - Math.pow(1 - progressRatio, 2);
                const progress = 20 + easedProgress * 70; // 20% to 90%
                setProcessingProgress(progress);
            }, 100);
            
            progressIntervalRef.current = aiProgressInterval;
            
            let response: Response;
            try {
                setProcessingSubStatus("AI is analyzing images...");
                
                const fetchPromise = fetch("/api/extract-data", {
                    method: "POST",
                    body: formData,
                    credentials: "include", // Include cookies for authentication
                });
                
                response = await fetchPromise;
            } catch (fetchError: any) {
                console.error("Fetch error:", fetchError);
                if (aiProgressInterval) clearInterval(aiProgressInterval);
                throw new Error(`Network error: ${fetchError.message || "Failed to connect to server"}`);
            }
            
            // Clear the AI progress interval once we get the response
            if (aiProgressInterval) {
                clearInterval(aiProgressInterval);
                aiProgressInterval = null;
            }
            
            setProcessingProgress(90);
            setProcessingSubStatus("Received AI response, processing...");
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (!response.ok) {
                let errorMessage = "Failed to extract data from images";
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.error || errorMessage;
                    
                    // Provide more helpful message for authentication errors
                    if (response.status === 401 || errorMessage.includes("Unauthorized") || errorMessage.includes("Authentication required")) {
                        errorMessage = "Your session has expired. Please refresh the page and try again.";
                    }
                    
                    if (errorData.details) {
                        console.error("API error details:", errorData.details);
                    }
                } catch {
                    if (response.status === 401) {
                        errorMessage = "Your session has expired. Please refresh the page and try again.";
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
            setProcessingSubStatus("Extracting details from images...");
            setProcessingProgress(92);
            
            const extractedData = result.data;
            
            // Step 5: Verify and validate
            setProcessingSubStatus("Verifying and confirming information...");
            setProcessingProgress(94);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            setProcessingSubStatus("Measuring confidence levels...");
            setProcessingProgress(96);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Step 6: Format data for form
            setProcessingSubStatus("Formatting extracted data...");
            setProcessingProgress(97);
            
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
            setProcessingSubStatus("Populating form fields...");
            setProcessingProgress(99);
            
            // Update form with extracted data
            // This will set selectedMode to "en" and autoFillData, which will cause the modal to close automatically
            onFillForm(finalFormData);
            
            // Add to gallery
            if (allGalleryUrls.length > 0) {
                onAddToGallery(allGalleryUrls);
            }

            // Set profile photo
            if (profilePhotoUrl) {
                onSetProfilePhoto(profilePhotoUrl);
            }

            setProcessingStatus("Complete!");
            setProcessingSubStatus("Form has been populated successfully!");
            setProcessingProgress(100);
            
            setTimeout(() => {
                // Reset state
                setAllImages([]);
                setExtractedText("");
                setTranslatedText("");
                setSelectedProfileIndex(null);
                setProcessingSubStatus("");
                setProcessingProgress(0);
                startTimeRef.current = null;
                // Don't call onClose() here - the modal will close automatically when selectedMode changes
                // Calling onClose() would reset selectedMode to null, undoing the form fill
            }, 1500);
        } catch (error: any) {
            console.error("Processing error:", error);
            // Clear interval on error
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            alert(`Failed to process images: ${error?.message || "Please try again."}`);
        } finally {
            setIsProcessing(false);
            setProcessingStatus("");
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
                <ProgressOverlay 
                    isVisible={isProcessing} 
                    status={processingStatus}
                    subStatus={processingSubStatus}
                    progress={processingProgress}
                />
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
                            
                            <div className="grid grid-cols-3 gap-3">
                                {allImages.map((file, index) => (
                                    <div
                                        key={index}
                                        className={`relative aspect-square rounded-md overflow-hidden border-2 ${
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
                                                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
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
            </>
        );
    }

    return (
        <>
            <ProgressOverlay 
                isVisible={isProcessing} 
                status={processingStatus}
                subStatus={processingSubStatus}
                progress={processingProgress}
            />
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
                        
                        <div className="grid grid-cols-3 gap-3">
                            {allImages.map((file, index) => (
                                <div
                                    key={index}
                                    className={`relative aspect-square rounded-md overflow-hidden border-2 ${
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
                                            className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
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
        </>
    );
}

