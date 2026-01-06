"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
// Checking previous file list, I didn't see a `dialog` in `components/ui` list (only BottomNav, Navbar, MultiSelect...). 
// I will build a self-contained modal to avoid dependency issues.

interface ImageGalleryModalProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageGalleryModal({ images, initialIndex = 0, isOpen, onClose }: ImageGalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!isOpen) return null;

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-200">
            {/* Controls */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Main Image Container */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
                {images.length > 1 && (
                    <button
                        onClick={prevImage}
                        className="absolute left-2 md:left-8 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>
                )}

                <div className={`relative ${isFullscreen ? 'w-full h-full' : 'max-w-4xl max-h-[80vh] w-full h-full'} transition-all duration-300`}>
                    <Image
                        src={images[currentIndex]}
                        alt={`Gallery Image ${currentIndex + 1}`}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {images.length > 1 && (
                    <button
                        onClick={nextImage}
                        className="absolute right-2 md:right-8 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                )}
            </div>

            {/* Thumbnails Footer */}
            <div className="w-full overflow-x-auto p-4 flex gap-2 justify-center bg-black/50 backdrop-blur-sm shrink-0">
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`relative w-16 h-16 shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-75'}`}
                    >
                        <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
                    </button>
                ))}
            </div>

            <div className="absolute top-4 left-4 text-white text-sm bg-black/30 px-3 py-1 rounded-full">
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    );
}
