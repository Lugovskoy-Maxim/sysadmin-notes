import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const svg = readFileSync(join(iconsDir, "icon.svg"));

mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(iconsDir, `icon-${size}.png`));
}

await sharp(svg).resize(180, 180).png().toFile(join(iconsDir, "apple-touch-icon.png"));
await sharp(svg).resize(32, 32).png().toFile(join(iconsDir, "favicon-32.png"));

console.log("PWA icons generated in public/icons/");