"use client";

import { useState, useRef, useEffect } from "react";
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
    
    // Touch swipe state
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);
    const minSwipeDistance = 50; // Minimum distance in pixels to trigger a swipe

    // Update currentIndex when initialIndex changes (e.g., when modal opens with a different image)
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    if (!isOpen) return null;

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Touch event handlers for swipe support
    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchEndY.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
        touchEndY.current = e.targetTouches[0].clientY;
        
        // Prevent scrolling if this is a horizontal swipe
        if (touchStartX.current !== null && touchStartY.current !== null) {
            const deltaX = Math.abs(touchEndX.current - touchStartX.current);
            const deltaY = Math.abs(touchEndY.current - touchStartY.current);
            // If horizontal movement is greater than vertical, prevent default to avoid scrolling
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        }
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
        
        const distanceX = touchStartX.current - touchEndX.current;
        const distanceY = touchStartY.current - touchEndY.current;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;
        const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

        // Only handle horizontal swipes (ignore vertical scrolling)
        if (!isVerticalSwipe) {
            if (isLeftSwipe && images.length > 1) {
                nextImage();
            }
            if (isRightSwipe && images.length > 1) {
                prevImage();
            }
        }
        
        // Reset touch positions
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        touchEndY.current = null;
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
            <div 
                className="relative w-full h-full flex items-center justify-center p-4"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
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
