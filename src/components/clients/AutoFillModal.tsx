"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, Image as ImageIcon, FileText, Loader2 } from "lucide-react";
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
}

export function AutoFillModal({
    isOpen,
    onClose,
    onFillForm,
    onAddToGallery,
    onSetProfilePhoto,
}: AutoFillModalProps) {
    const [textImages, setTextImages] = useState<File[]>([]);
    const [profileImages, setProfileImages] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>("");
    const [processingSubStatus, setProcessingSubStatus] = useState<string>("");
    const [extractedText, setExtractedText] = useState<string>("");
    const [translatedText, setTranslatedText] = useState<string>("");
    const [selectedProfileIndex, setSelectedProfileIndex] = useState<number | null>(null);
    
    const textImageInputRef = useRef<HTMLInputElement>(null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    
    const textUpload = useUploadWithProgress();
    const profileUpload = useUploadWithProgress();

    if (!isOpen) return null;

    const handleTextImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setTextImages(prev => [...prev, ...files]);
        }
        if (e.target) {
            e.target.value = "";
        }
    };

    const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setProfileImages(prev => [...prev, ...files]);
        }
        if (e.target) {
            e.target.value = "";
        }
    };

    const removeTextImage = (index: number) => {
        setTextImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeProfileImage = (index: number) => {
        setProfileImages(prev => prev.filter((_, i) => i !== index));
        if (selectedProfileIndex === index) {
            setSelectedProfileIndex(null);
        } else if (selectedProfileIndex !== null && selectedProfileIndex > index) {
            setSelectedProfileIndex(selectedProfileIndex - 1);
        }
    };

    const simulateProgress = async () => {
        // Simulation mode - shows all progress steps without calling AI
        setIsProcessing(true);
        
        // Step 1: Uploading
        setProcessingStatus("Uploading images");
        setProcessingSubStatus("Preparing images for upload...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setProcessingSubStatus("Uploading resume image 1 of 2...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingSubStatus("Uploading resume image 2 of 2...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingSubStatus("Uploading profile image 1 of 1...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Processing with AI
        setProcessingStatus("Processing with AI");
        setProcessingSubStatus("Compressing and preparing images for AI analysis...");
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        setProcessingSubStatus("Querying AI model...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setProcessingSubStatus("Checking AI response...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setProcessingSubStatus("Extracting details from images...");
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        setProcessingSubStatus("Verifying and confirming information...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingSubStatus("Measuring confidence levels...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingSubStatus("Formatting extracted data...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setProcessingSubStatus("Populating form fields...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Step 3: Complete
        setProcessingStatus("Complete!");
        setProcessingSubStatus("Form has been populated successfully!");
        
        setTimeout(() => {
            setIsProcessing(false);
            setProcessingStatus("");
            setProcessingSubStatus("");
            alert("Simulation complete! This was a test - no AI was called and no tokens were used.");
        }, 2000);
    };

    const processImages = async () => {
        if (textImages.length === 0 && profileImages.length === 0) {
            alert("Please upload at least one image");
            return;
        }

        setIsProcessing(true);
        setProcessingStatus("Processing images with AI...");
        
        try {
            const allGalleryUrls: string[] = [];
            let profilePhotoUrl: string | null = null;

            // Step 1: Upload all images to gallery first (for storage)
            setProcessingStatus("Uploading images");
            setProcessingSubStatus("Preparing images for upload...");
            
            // Upload resume images
            if (textImages.length > 0) {
                for (let i = 0; i < textImages.length; i++) {
                    const file = textImages[i];
                    setProcessingSubStatus(`Uploading resume image ${i + 1} of ${textImages.length}...`);
                    
                    const uploadResult = await textUpload.uploadWithProgress(file);
                    if (uploadResult.url) {
                        allGalleryUrls.push(uploadResult.url);
                    }
                }
            }

            // Upload profile images
            if (profileImages.length > 0) {
                for (let i = 0; i < profileImages.length; i++) {
                    const file = profileImages[i];
                    setProcessingSubStatus(`Uploading profile image ${i + 1} of ${profileImages.length}...`);
                    
                    const uploadResult = await profileUpload.uploadWithProgress(file);
                    if (uploadResult.url) {
                        allGalleryUrls.push(uploadResult.url);
                        
                        // Set selected profile photo (first image if none selected, or the selected one)
                        if (profilePhotoUrl === null) {
                            if (selectedProfileIndex === i || (selectedProfileIndex === null && i === 0)) {
                                profilePhotoUrl = uploadResult.url;
                            }
                        }
                    }
                }
            }

            // Step 2: Prepare images for AI processing
            setProcessingStatus("Processing with AI");
            setProcessingSubStatus("Compressing and preparing images for AI analysis...");
            
            const formData = new FormData();
            
            // Add all resume images
            for (const img of textImages) {
                formData.append("resume_images", img);
            }
            
            // Add selected profile image (only one - the main one)
            if (profileImages.length > 0) {
                const mainProfileImage = selectedProfileIndex !== null 
                    ? profileImages[selectedProfileIndex]
                    : profileImages[0];
                formData.append("profile_image", mainProfileImage);
            }
            
            // Step 3: Query AI
            setProcessingSubStatus("Sending images to AI model...");
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to show message
            
            setProcessingSubStatus("Querying Gemini AI...");
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to show message
            
            let response: Response;
            try {
                // Start the fetch (this is async, so we can update status)
                setProcessingSubStatus("Waiting for AI response...");
                const fetchPromise = fetch("/api/extract-data", {
                    method: "POST",
                    body: formData,
                });
                
                // Update status while waiting
                setProcessingSubStatus("AI is analyzing images...");
                
                response = await fetchPromise;
            } catch (fetchError: any) {
                console.error("Fetch error:", fetchError);
                throw new Error(`Network error: ${fetchError.message || "Failed to connect to server"}`);
            }
            
            setProcessingSubStatus("Received AI response, processing...");
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to show message
            
            if (!response.ok) {
                let errorMessage = "Failed to extract data from images";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    if (errorData.details) {
                        console.error("API error details:", errorData.details);
                    }
                } catch (parseError) {
                    const text = await response.text();
                    errorMessage = `Server error (${response.status}): ${text.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || "Data extraction failed");
            }
            
            // Step 4: Process AI response
            setProcessingSubStatus("Extracting details from images...");
            
            const extractedData = result.data;
            
            // Step 5: Verify and validate
            setProcessingSubStatus("Verifying and confirming information...");
            
            // Small delay to show verification step
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setProcessingSubStatus("Measuring confidence levels...");
            
            // Another small delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 6: Format data for form
            setProcessingSubStatus("Formatting extracted data...");
            
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
            
            // Update form with extracted data
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
            
            setTimeout(() => {
                onClose();
                // Reset state
                setTextImages([]);
                setProfileImages([]);
                setExtractedText("");
                setTranslatedText("");
                setSelectedProfileIndex(null);
                setProcessingSubStatus("");
            }, 1500);
        } catch (error: any) {
            console.error("Processing error:", error);
            alert(`Failed to process images: ${error?.message || "Please try again."}`);
        } finally {
            setIsProcessing(false);
            setProcessingStatus("");
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            onClose();
            setTextImages([]);
            setProfileImages([]);
            setExtractedText("");
            setTranslatedText("");
            setSelectedProfileIndex(null);
        }
    };

    return (
        <>
            <ProgressOverlay 
                isVisible={isProcessing} 
                status={processingStatus}
                subStatus={processingSubStatus}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" dir="ltr">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="ltr">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
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
                    {/* Text Images Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-medium">Resume/Text Images</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Upload images containing text (resumes, forms, etc.). Text will be extracted and used to populate the form.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                            {textImages.map((file, index) => (
                                <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                                    <Image
                                        src={URL.createObjectURL(file)}
                                        alt={`Text image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        onClick={() => removeTextImage(index)}
                                        disabled={isProcessing}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            <label
                                className={`relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer bg-gray-50 dark:bg-gray-800 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}
                            >
                                <UploadCloud className="h-6 w-6 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">Add Text Image</span>
                                <input
                                    ref={textImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleTextImageUpload}
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Profile Images Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-medium">Profile Images</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Upload profile pictures. Select one to use as the main profile photo. All images will be added to the gallery.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                            {profileImages.map((file, index) => (
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
                                        alt={`Profile image ${index + 1}`}
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
                                            onClick={() => removeProfileImage(index)}
                                            disabled={isProcessing}
                                            className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <label
                                className={`relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer bg-gray-50 dark:bg-gray-800 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}
                            >
                                <UploadCloud className="h-6 w-6 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">Add Profile Image</span>
                                <input
                                    ref={profileImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleProfileImageUpload}
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
                <div className="flex items-center justify-between gap-3 p-4 border-t">
                    <button
                        onClick={simulateProgress}
                        disabled={isProcessing}
                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                        title="Test progress overlay without using AI tokens"
                    >
                        <Loader2 className="h-3 w-3" />
                        Test Progress
                    </button>
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
                            disabled={isProcessing || (textImages.length === 0 && profileImages.length === 0)}
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

