/**
 * Generates icon-heart-192.png and icon-heart-512.png from icon-heart.svg
 * for default PWA icon (Android prefers PNG). Run: node scripts/generate-heart-icons.js
 */
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "icon-heart.svg");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("Run: npm install sharp --save-dev");
    process.exit(1);
  }
  const svg = fs.readFileSync(svgPath);
  for (const size of [192, 512]) {
    const out = path.join(publicDir, `icon-heart-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log("Written", out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
