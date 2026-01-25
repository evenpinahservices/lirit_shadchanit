"use client";

import { useState, useEffect, useRef } from "react";

interface FieldWithTooltipProps {
    children: React.ReactNode;
    sourceQuote: string | null | undefined;
    fieldName: string;
}

export function FieldWithTooltip({ 
    children, 
    sourceQuote, 
    fieldName 
}: FieldWithTooltipProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("bottom");
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const fieldRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    // Detect touch device on mount
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isTabletOrLaptop = window.innerWidth >= 768;
            setIsTouchDevice(hasTouch && isTabletOrLaptop);
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);
    
    // Close tooltip when clicking outside
    useEffect(() => {
        if (!showTooltip) return;
        
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (
                fieldRef.current && 
                tooltipRef.current &&
                !fieldRef.current.contains(event.target as Node) &&
                !tooltipRef.current.contains(event.target as Node)
            ) {
                setShowTooltip(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showTooltip]);
    
    // Only show tooltip if sourceQuote exists and is not empty
    if (!sourceQuote || (typeof sourceQuote === 'string' && sourceQuote.trim() === '') || sourceQuote === 'null') {
        return <>{children}</>;
    }
    
    const calculatePosition = () => {
        if (fieldRef.current) {
            const rect = fieldRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            const tooltipHeight = 250;
            
            if (rect.top < 300) {
                setPosition("bottom");
            } else if (spaceAbove < tooltipHeight) {
                setPosition("bottom");
            } else if (spaceBelow > spaceAbove) {
                setPosition("bottom");
            } else {
                setPosition("top");
            }
        }
    };
    
    const handleMouseEnter = () => {
        if (!isTouchDevice) {
            calculatePosition();
            setShowTooltip(true);
        }
    };
    
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (isTouchDevice || window.innerWidth >= 768) {
            e.preventDefault();
            e.stopPropagation();
            if (showTooltip) {
                setShowTooltip(false);
            } else {
                calculatePosition();
                setShowTooltip(true);
            }
        }
    };
    
    return (
        <div 
            ref={fieldRef}
            className="relative w-full group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => {
                if (!isTouchDevice) {
                    setShowTooltip(false);
                }
            }}
            onClick={handleClick}
            onTouchStart={handleClick}
        >
            {children}
            {showTooltip && (
                <div 
                    ref={tooltipRef}
                    className={`absolute z-50 w-80 max-w-[90vw] p-3 text-sm bg-white dark:bg-gray-100 text-gray-900 dark:text-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-400 pointer-events-auto`}
                    style={position === "top" ? {
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    } : {
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-semibold mb-2 text-xs text-gray-600 dark:text-gray-700 uppercase tracking-wide">AI Source Quote:</div>
                    <div className="text-xs whitespace-pre-wrap wrap-break-word leading-relaxed text-gray-800 dark:text-gray-900">{sourceQuote}</div>
                    {position === "top" ? (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-gray-100"></div>
                    ) : (
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-white dark:border-b-gray-100"></div>
                    )}
                </div>
            )}
        </div>
    );
}
