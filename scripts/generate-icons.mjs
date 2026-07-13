// Generates PWA icons from the HermesMark (kinetic relay).
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const INK = "#1F262E";
const STROKE = "#3EB8CC";

function markSvg(size, scale) {
  const s = (size * scale) / 64;
  const offset = (size - 64 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${offset} ${offset}) scale(${s})">
      <path d="M32 21 L43 32 L32 43 L21 32 Z" fill="none" stroke="${STROKE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M19 27 L6 18 M19 37 L6 44" stroke="${STROKE}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M45 27 L58 18 M45 37 L58 44" stroke="${STROKE}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M32 16 V11 M32 53 V48" stroke="${STROKE}" stroke-width="4" stroke-linecap="round"/>
    </g>
  </svg>`;
}

await mkdir("public", { recursive: true });
const jobs = [
  { file: "public/pwa-192x192.png", size: 192, scale: 0.86 },
  { file: "public/pwa-512x512.png", size: 512, scale: 0.86 },
  { file: "public/pwa-maskable-512x512.png", size: 512, scale: 0.6 },
];
for (const { file, size, scale } of jobs) {
  await sharp(Buffer.from(markSvg(size, scale))).png().toFile(file);
  console.log("wrote", file);
}
