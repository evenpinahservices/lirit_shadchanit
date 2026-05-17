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
    /** Start a smooth eased animation from fromPct toward targetPct over durationMs.
     *  Survives component unmounts (minimize). Call stopSimulatedProgress to stop early.
     *  Optional subStatusTemplate: include "{s}" which is replaced with elapsed seconds. */
    startSimulatedProgress: (fromPct: number, targetPct: number, durationMs: number, subStatusTemplate?: string) => void;
    stopSimulatedProgress: () => void;
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
    const simulatedProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (!isProcessing && simulatedProgressIntervalRef.current) {
            clearInterval(simulatedProgressIntervalRef.current);
            simulatedProgressIntervalRef.current = null;
        }
        setState((prev) => ({
            ...prev,
            isProcessing,
            ...(isProcessing ? { isOverlayOpen: true } : { isOverlayOpen: false, progress: 0, status: "", subStatus: "" }),
        }));
    }, []);

    const startSimulatedProgress = useCallback((
        fromPct: number,
        targetPct: number,
        durationMs: number,
        subStatusTemplate?: string,
    ) => {
        if (simulatedProgressIntervalRef.current) {
            clearInterval(simulatedProgressIntervalRef.current);
        }
        const startTime = Date.now();
        const CREEP_RATE = 0.001; // % per 100 ms tick ≈ 0.6 % per minute
        simulatedProgressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const ratio = elapsed / durationMs;
            const secs = Math.round(elapsed / 1000);
            const sub = subStatusTemplate ? subStatusTemplate.replace("{s}", String(secs)) : undefined;
            if (ratio < 0.95) {
                const eased = 1 - Math.pow(1 - Math.min(ratio, 0.95), 2);
                const progress = fromPct + eased * (targetPct - fromPct);
                setState((prev) => ({ ...prev, progress, ...(sub !== undefined ? { subStatus: sub } : {}) }));
            } else {
                setState((prev) => ({
                    ...prev,
                    progress: Math.min(prev.progress + CREEP_RATE, 98.9),
                    ...(sub !== undefined ? { subStatus: sub } : {}),
                }));
            }
        }, 100);
    }, []);

    const stopSimulatedProgress = useCallback(() => {
        if (simulatedProgressIntervalRef.current) {
            clearInterval(simulatedProgressIntervalRef.current);
            simulatedProgressIntervalRef.current = null;
        }
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
        startSimulatedProgress,
        stopSimulatedProgress,
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
