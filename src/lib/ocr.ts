import { createWorker } from 'tesseract.js';

export interface OCRResult {
    text: string;
    confidence: number;
}

/**
 * Extracts text from an image using OCR
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
    try {
        const worker = await createWorker('eng+heb'); // Support English and Hebrew
        const { data } = await worker.recognize(imageFile);
        await worker.terminate();
        
        return {
            text: data.text,
            confidence: data.confidence || 0
        };
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to extract text from image');
    }
}

/**
 * Detects if text contains Hebrew characters
 */
export function containsHebrew(text: string): boolean {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}


