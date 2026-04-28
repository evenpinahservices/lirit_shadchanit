// ── Rate limits ────────────────────────────────────────────────────────────────

export const RATE_LIMIT = {
    FORM_SUBMISSION: { maxRequests: 5, windowMs: 30 * 60 * 1000 },  // 5 per 30 min
    API_UPLOAD: { maxRequests: 50, windowMs: 60 * 60 * 1000 },       // 50 per hour
    API_EXTRACT: { maxRequests: 50, windowMs: 60 * 60 * 1000 },      // 50 per hour
} as const;

// ── DB connection pool ────────────────────────────────────────────────────────

export const DB_CONNECTION_CACHE_SIZE = 100;

// ── Image limits ──────────────────────────────────────────────────────────────

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;          // 10 MB per image
export const IMAGE_TOTAL_MAX_BYTES = 40 * 1024 * 1024;    // 40 MB cumulative
export const IMAGE_FETCH_TIMEOUT_MS = 30_000;              // 30 s

// ── Tokens ────────────────────────────────────────────────────────────────────

export const FORM_TOKEN_MAX_USAGE = 30;
export const FORM_TOKEN_EXPIRY_DAYS = 7;
export const INVITE_TOKEN_EXPIRY_DAYS = 7;

// ── Session ───────────────────────────────────────────────────────────────────

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;  // 7 days

// ── Matching ──────────────────────────────────────────────────────────────────

export const MATCH_DISMISS_TTL_DAYS = 30;

// ── Pagination ────────────────────────────────────────────────────────────────

export const CLIENT_QUERY_LIMIT = 1000;
