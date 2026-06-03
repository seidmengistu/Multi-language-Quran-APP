/**
 * Generate PWA PNG icons from the brand mark.
 *
 * Outputs into public/icons:
 *   - icon-192.png, icon-512.png          → manifest "any" icons (rounded, transparent)
 *   - icon-maskable-512.png               → Android adaptive icon (full-bleed, safe zone)
 *   - apple-touch-icon.png (180)          → iOS home-screen icon (opaque, square)
 *
 * Run:  node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

// The rounded brand mark (transparent corners) — used for the "any" icons.
const roundedSvg = await readFile(join(root, "public", "icon.svg"));

// A full-bleed variant for maskable / Apple icons: the same motif on an
// edge-to-edge emerald field, scaled to ~80% so it sits inside the safe zone.
const fullBleedSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12876a"/>
      <stop offset="1" stop-color="#0a4d3c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">
    <g fill="none" stroke="#e3b341" stroke-width="14" stroke-linejoin="round">
      <rect x="148" y="148" width="216" height="216" rx="34"/>
      <rect x="148" y="148" width="216" height="216" rx="34" transform="rotate(45 256 256)"/>
    </g>
    <circle cx="256" cy="256" r="40" fill="#f3e7c6" opacity="0.95"/>
  </g>
</svg>`);

await mkdir(outDir, { recursive: true });

async function render(svg, size, name) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, name));
  console.log("  ✓", name, `(${size}×${size})`);
}

console.log("Generating PWA icons →", outDir);
await render(roundedSvg, 192, "icon-192.png");
await render(roundedSvg, 512, "icon-512.png");
await render(fullBleedSvg, 512, "icon-maskable-512.png");
await render(fullBleedSvg, 180, "apple-touch-icon.png");

// Favicon (small, opaque) for browser tabs.
await render(fullBleedSvg, 48, "favicon-48.png");

console.log("Done.");
