/**
 * Generates Lirit PWA icons with 80% safe zone for Android (circle, squircle, etc.).
 * Run once: npm run generate-lirit-maskable
 * Output: public/lirit-logo-192-maskable.png, public/lirit-logo-512-maskable.png
 */
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const sizes = [192, 512];
const safeZoneScale = 0.8; // logo in center 80%

async function main() {
  const sharp = require("sharp");
  for (const size of sizes) {
    const inputPath = path.join(publicDir, `lirit-logo-${size}.png`);
    const outputPath = path.join(publicDir, `lirit-logo-${size}-maskable.png`);
    if (!fs.existsSync(inputPath)) {
      console.warn("Skip (missing):", inputPath);
      continue;
    }
    const scaled = Math.round(size * safeZoneScale);
    const padding = Math.round((size - scaled) / 2);
    const resized = await sharp(inputPath).resize(scaled, scaled).toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, left: padding, top: padding }])
      .png()
      .toFile(outputPath);
    console.log("Written", outputPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
