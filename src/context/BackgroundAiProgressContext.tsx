"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProgressOverlay } from "@/components/clients/ProgressOverlay";

interface BackgroundAiProgressState {
    isProcessing: boolean;
    progress: number;
    status: string;
    subStatus: string;
    isOverlayOpen: boolean;
}

interface BackgroundAiProgressContextValue extends BackgroundAiProgressState {
    setProgress: (n: number) => void;
    setStatus: (s: string) => void;
    setSubStatus: (s: string) => void;
    setProcessing: (v: boolean) => void;
    setCancelCallback: (fn: (() => void) | null) => void;
    cancelUpload: () => void;
    minimize: () => void;
    restoreOverlay: () => void;
}

const initialState: BackgroundAiProgressState = {
    isProcessing: false,
    progress: 0,
    status: "",
    subStatus: "",
    isOverlayOpen: false,
};

const BackgroundAiProgressContext = createContext<BackgroundAiProgressContextValue | null>(null);

export function useBackgroundAiProgress() {
    const ctx = useContext(BackgroundAiProgressContext);
    return ctx;
}

export function BackgroundAiProgressProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<BackgroundAiProgressState>(initialState);
    const cancelCallbackRef = useRef<(() => void) | null>(null);

    const setCancelCallback = useCallback((fn: (() => void) | null) => {
        cancelCallbackRef.current = fn;
    }, []);

    const cancelUpload = useCallback(() => {
        cancelCallbackRef.current?.();
        cancelCallbackRef.current = null;
    }, []);

    const setProgress = useCallback((progress: number) => {
        setState((prev) => ({ ...prev, progress }));
    }, []);

    const setStatus = useCallback((status: string) => {
        setState((prev) => ({ ...prev, status }));
    }, []);

    const setSubStatus = useCallback((subStatus: string) => {
        setState((prev) => ({ ...prev, subStatus }));
    }, []);

    const setProcessing = useCallback((isProcessing: boolean) => {
        setState((prev) => ({
            ...prev,
            isProcessing,
            ...(isProcessing ? { isOverlayOpen: true } : { isOverlayOpen: false, progress: 0, status: "", subStatus: "" }),
        }));
    }, []);

    const minimize = useCallback(() => {
        setState((prev) => ({ ...prev, isOverlayOpen: false }));
        router.push("/");
    }, [router]);

    const restoreOverlay = useCallback(() => {
        setState((prev) => ({ ...prev, isOverlayOpen: true }));
    }, []);

    const value: BackgroundAiProgressContextValue = {
        ...state,
        setProgress,
        setStatus,
        setSubStatus,
        setProcessing,
        setCancelCallback,
        cancelUpload,
        minimize,
        restoreOverlay,
    };

    return (
        <BackgroundAiProgressContext.Provider value={value}>
            {children}
            {state.isProcessing && state.isOverlayOpen && (
                <ProgressOverlay
                    isVisible={true}
                    status={state.status}
                    subStatus={state.subStatus}
                    progress={state.progress}
                    onMinimize={minimize}
                    onCancel={cancelUpload}
                />
            )}
        </BackgroundAiProgressContext.Provider>
    );
}
