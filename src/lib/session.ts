import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "";

function warn() {
    if (process.env.NODE_ENV === "production") {
        console.warn("[SECURITY] SESSION_SECRET is not set. Session cookies are unsigned and can be forged.");
    }
}

export function signSession(data: object): string {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    if (!SECRET) {
        warn();
        return payload;
    }
    const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    return `${payload}.${sig}`;
}

export function parseSession(token: string): Record<string, unknown> | null {
    if (!token || typeof token !== "string") return null;

    if (!SECRET) {
        warn();
        // Support both legacy plain-JSON cookies and unsigned base64url cookies
        try {
            return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
        } catch {
            try {
                return JSON.parse(token);
            } catch {
                return null;
            }
        }
    }

    const dot = token.lastIndexOf(".");
    if (dot < 0) {
        // Legacy unsigned cookie — reject when SECRET is set
        return null;
    }

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");

    try {
        const sigBuf = Buffer.from(sig, "base64url");
        const expBuf = Buffer.from(expected, "base64url");
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }
    } catch {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        return null;
    }
}
