"use client";

import { useEffect } from "react";

/**
 * Registers the static service worker for PWA installability (Android Chrome).
 * Only runs in production and in the browser.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch(() => {});
  }, []);

  return null;
}
