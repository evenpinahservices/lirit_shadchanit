/**
 * Branding config: one codebase, switchable theme + logos per deployment.
 * Default = ShadchanitDB (red, heart icon). Lirit = LiritDB (green, Lirit logo).
 * Set NEXT_PUBLIC_BRAND=lirit for Lirit; omit or default for ShadchanitDB.
 */

export type BrandId = "lirit" | "default";

export interface BrandConfig {
  themeColor: string;
  backgroundColor: string;
  appName: string;
  shortName: string;
  /** Navbar: logo image path, or null to use Heart icon */
  logoNavbar: string | null;
  /** PWA manifest icons (PNG or SVG) */
  icon192: string;
  icon512: string;
  /** true if icons are SVG (manifest uses type/sizes accordingly) */
  iconSvg?: boolean;
}

export const brands: Record<BrandId, BrandConfig> = {
  default: {
    themeColor: "#3b82f6",
    backgroundColor: "#f9fafb",
    appName: "ShidduchDB - Matchmaking Database",
    shortName: "ShidduchDB",
    logoNavbar: null,
    icon192: "/icon-heart.svg",
    icon512: "/icon-heart.svg",
    iconSvg: true,
  },
  lirit: {
    themeColor: "#7ccd7c",
    backgroundColor: "#f9fafb",
    appName: "LiritDB - Matchmaking Database",
    shortName: "LiritDB",
    logoNavbar: "/lirit-logo-192.png",
    icon192: "/lirit-logo-192-maskable.png",
    icon512: "/lirit-logo-512-maskable.png",
  },
};

const brandId = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BRAND) as BrandId | undefined;
const validIds: BrandId[] = ["lirit", "default"];
export const currentBrandId: BrandId = brandId === "lirit" ? "lirit" : "default";

export function getBrand(): BrandConfig {
  return brands[currentBrandId];
}
