"use client";

import { useState, useRef } from "react";
import { X, FileJson, Upload, FileText } from "lucide-react";

interface JsonFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFillForm: (data: any) => void;
}

// Helper function to extract JSON from text (similar to FastAPI's extract_json_from_response)
function extractJsonFromText(text: string): any {
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON object directly
    const directMatch = text.match(/\{[\s\S]*\}/);
    if (directMatch) {
        return JSON.parse(directMatch[0]);
    }
    
    throw new Error("No JSON found in text. Please ensure the file contains valid JSON.");
}

export function JsonFillModal({
    isOpen,
    onClose,
    onFillForm,
}: JsonFillModalProps) {
    const [jsonText, setJsonText] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError("");

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const fileExtension = file.name.split('.').pop()?.toLowerCase();
                
                let parsed: any;
                
                // Handle .txt files - extract JSON from text
                if (fileExtension === 'txt') {
                    try {
                        parsed = extractJsonFromText(content);
                    } catch (txtErr: any) {
                        setError(`Failed to extract JSON from text file: ${txtErr.message}`);
                        setIsProcessing(false);
                        return;
                    }
                } 
                // Handle .json files - parse directly
                else if (fileExtension === 'json') {
                    parsed = JSON.parse(content);
                }
                // Try to auto-detect: if it looks like JSON, parse it; otherwise try to extract
                else {
                    try {
                        // First try direct JSON parse
                        parsed = JSON.parse(content);
                    } catch {
                        // If that fails, try extracting from text
                        parsed = extractJsonFromText(content);
                    }
                }
                
                setJsonText(JSON.stringify(parsed, null, 2));
                setError("");
            } catch (err: any) {
                setError(`Invalid file: ${err.message}. Please ensure the file contains valid JSON or text with JSON.`);
            } finally {
                setIsProcessing(false);
            }
        };
        
        reader.onerror = () => {
            setError("Failed to read file");
            setIsProcessing(false);
        };
        
        reader.readAsText(file);
        
        if (e.target) {
            e.target.value = "";
        }
    };

    const handlePaste = () => {
        navigator.clipboard.readText().then(text => {
            try {
                let parsed: any;
                // Try direct JSON parse first
                try {
                    parsed = JSON.parse(text);
                } catch {
                    // If that fails, try extracting JSON from text
                    parsed = extractJsonFromText(text);
                }
                setJsonText(JSON.stringify(parsed, null, 2));
                setError("");
            } catch (err: any) {
                setError(`Invalid JSON or text: ${err.message}`);
            }
        }).catch(() => {
            setError("Could not read from clipboard");
        });
    };

    const handleFill = () => {
        if (!jsonText.trim()) {
            setError("Please provide JSON data");
            return;
        }

        try {
            let parsed: any;
            
            // Try direct JSON parse first
            try {
                parsed = JSON.parse(jsonText);
            } catch {
                // If that fails, try extracting JSON from text (handles markdown code blocks)
                parsed = extractJsonFromText(jsonText);
            }
            
            // Validate it's an object
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("JSON must be an object");
            }

            // Fill the form
            onFillForm(parsed);
            onClose();
            
            // Reset
            setJsonText("");
            setError("");
        } catch (err: any) {
            setError(`Invalid JSON or text: ${err.message}`);
        }
    };

    const handleClose = () => {
        onClose();
        setJsonText("");
        setError("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" dir="ltr">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="ltr">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <FileJson className="h-5 w-5 text-purple-600" />
                        <h2 className="text-xl font-semibold">Fill Form with JSON/TXT</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a JSON or TXT file, or paste JSON/text data to populate the form. TXT files will be automatically converted to JSON. This is useful for testing the form pipeline.
                    </p>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Upload JSON or Text File</label>
                        <div className="flex gap-2">
                            <label className={`flex-1 relative flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 cursor-pointer bg-gray-50 dark:bg-gray-800 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isProcessing ? (
                                    <>
                                        <FileText className="h-5 w-5 mr-2 text-gray-400 animate-pulse" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5 mr-2 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Choose JSON/TXT File</span>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.txt,application/json,text/plain"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isProcessing}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handlePaste}
                                disabled={isProcessing}
                                className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Paste from Clipboard
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Supports: <code>.json</code> files or <code>.txt</code> files containing JSON (with or without markdown code blocks)
                        </p>
                    </div>

                    {/* JSON Editor */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">JSON Data (or paste text with JSON)</label>
                        <textarea
                            value={jsonText}
                            onChange={(e) => {
                                setJsonText(e.target.value);
                                setError("");
                            }}
                            onBlur={() => {
                                // Try to auto-format if it's valid JSON
                                if (jsonText.trim()) {
                                    try {
                                        const parsed = JSON.parse(jsonText);
                                        setJsonText(JSON.stringify(parsed, null, 2));
                                        setError("");
                                    } catch {
                                        // Not valid JSON yet, might be text with JSON - that's okay
                                    }
                                }
                            }}
                            className="w-full h-64 p-3 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm placeholder:text-sm"
                            placeholder='Paste JSON or text with JSON here:\n{\n  "fullName": "John Doe",\n  "email": "john@example.com",\n  ...\n}\n\nOr text with markdown:\n```json\n{...}\n```'
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Example */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            <strong>Tip:</strong> You can upload:
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-disc">
                            <li>JSON files (<code>.json</code>) containing extracted client data</li>
                            <li>Text files (<code>.txt</code>) containing JSON (raw JSON or in markdown code blocks)</li>
                            <li>Paste JSON or text directly into the textarea below</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFill}
                        disabled={!jsonText.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <FileJson className="h-4 w-4" />
                        Fill Form
                    </button>
                </div>
            </div>
        </div>
    );
}

