import { getBrand } from "@/config/branding";
import { NextResponse } from "next/server";

export function GET() {
  const brand = getBrand();
  const isSvg = brand.iconSvg === true;
  const manifest = {
    name: brand.appName,
    short_name: brand.shortName,
    description: "Client management and matchmaking system",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: brand.themeColor,
    background_color: brand.backgroundColor,
    icons: isSvg
      ? [
          { src: brand.icon192, sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: brand.icon512, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ]
      : [
          { src: brand.icon192, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: brand.icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
