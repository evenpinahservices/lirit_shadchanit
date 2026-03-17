/**
 * Maps technical/API errors to user-friendly messages and actionable suggestions.
 * Use this so clients see clear instructions instead of raw server/network errors.
 */

export interface FriendlyError {
    title: string;
    message: string;
    suggestion?: string;
}

/** Context for the error (used to tailor messages) */
export type ErrorContext =
    | "process-images"
    | "approve-client"
    | "reject-client"
    | "save-client"
    | "submit-form"
    | "upload"
    | "generate-link"
    | "bug-report"
    | "generic";

const IMAGE_TOO_LARGE_PATTERNS = [
    "413",
    "Request Entity Too Large",
    "FUNCTION_PAYLOAD_TOO_LARGE",
    "payload too large",
    "entity too large",
];

const NETWORK_PATTERNS = [
    "Failed to fetch",
    "Network error",
    "NetworkError",
    "ERR_NETWORK",
    "ERR_CONNECTION",
    "timeout",
    "timed out",
];

const AUTH_PATTERNS = [
    "401",
    "Unauthorized",
    "Authentication required",
    "session has expired",
];

const SERVER_RENDER_PATTERNS = [
    "Server Components render",
    "An error occurred in the Server Components",
    "digest property",
];

/**
 * Returns a user-friendly error for display in the UI.
 * Detects common cases (413, network, auth, server render) and returns
 * a clear title, message, and optional suggestion.
 */
export function getFriendlyError(
    rawError: unknown,
    context: ErrorContext = "generic"
): FriendlyError {
    const message =
        typeof rawError === "string"
            ? rawError
            : (rawError as Error)?.message ?? String(rawError);
    const lower = message.toLowerCase();

    // Image / payload too large (e.g. Vercel function limit)
    if (IMAGE_TOO_LARGE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
        if (context === "process-images") {
            return {
                title: "Images too large",
                message: "The images you uploaded are too large for our server to process in one go.",
                suggestion:
                    "Try uploading fewer images at once, or use smaller file sizes (e.g. compress or resize before uploading).",
            };
        }
        return {
            title: "Upload too large",
            message: "The file or data you sent is too large.",
            suggestion: "Try smaller files or fewer items and try again.",
        };
    }

    // Network / fetch failures
    if (NETWORK_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
        if (context === "process-images") {
            return {
                title: "Connection problem",
                message: "We couldn’t reach the server while processing your images.",
                suggestion:
                    "Check your internet connection and try again. If you’re on mobile data, try Wi‑Fi.",
            };
        }
        return {
            title: "Connection problem",
            message: "We couldn’t connect to the server.",
            suggestion: "Check your internet connection and try again.",
        };
    }

    // Auth / session
    if (AUTH_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
        return {
            title: "Session expired",
            message: "Your session has expired.",
            suggestion: "Refresh the page and log in again if needed.",
        };
    }

    // Next.js Server Components / production generic error
    if (SERVER_RENDER_PATTERNS.some((p) => message.includes(p))) {
        if (context === "approve-client" || context === "reject-client") {
            return {
                title: "Something went wrong",
                message: "We couldn’t complete the approval. This is usually temporary.",
                suggestion: "Please try again in a moment. If it keeps happening, refresh the page and try again.",
            };
        }
        return {
            title: "Something went wrong",
            message: "An error occurred on our side. We didn’t change anything.",
            suggestion: "Please try again in a moment, or refresh the page.",
        };
    }

    // Known friendly messages (already user-facing) – pass through with minimal wrapping
    if (
        message.includes("Please upload at least one image") ||
        message.includes("Please provide either an email or phone")
    ) {
        return {
            title: "Missing information",
            message,
        };
    }

    // Fallback: generic friendly error (don’t expose raw message to user)
    if (context === "process-images") {
        return {
            title: "Couldn’t process images",
            message: "Something went wrong while processing your images.",
            suggestion: "Please try again. If it keeps failing, try fewer or smaller images.",
        };
    }
    if (context === "approve-client") {
        return {
            title: "Couldn’t approve client",
            message: "Something went wrong while approving.",
            suggestion: "Please try again. If it keeps happening, refresh the page.",
        };
    }
    if (context === "reject-client") {
        return {
            title: "Couldn’t reject",
            message: "Something went wrong while rejecting.",
            suggestion: "Please try again.",
        };
    }
    if (context === "save-client" || context === "submit-form") {
        return {
            title: "Couldn’t save",
            message: "Your changes couldn’t be saved.",
            suggestion: "Please try again. If it keeps failing, refresh and re-enter your information.",
        };
    }
    if (context === "generate-link") {
        return {
            title: "Couldn’t generate link",
            message: "We couldn’t create the link.",
            suggestion: "Please try again. If it keeps failing, refresh the page.",
        };
    }
    if (context === "bug-report") {
        return {
            title: "Couldn’t send report",
            message: "Your bug report couldn’t be sent.",
            suggestion: "Please try again or describe the issue in an email.",
        };
    }

    return {
        title: "Something went wrong",
        message: "An unexpected error occurred.",
        suggestion: "Please try again. If it keeps happening, refresh the page.",
    };
}
