const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];

function createSvg(size) {
  const scale = size / 128;
  const strokeWidth = Math.max(2, Math.round(10 * scale));
  const fontSize = Math.round(36 * scale);
  const radius = Math.round(28 * scale);
  const cx = Math.round(52 * scale);
  const cy = Math.round(52 * scale);
  const lineX1 = Math.round(72 * scale);
  const lineY1 = Math.round(72 * scale);
  const lineX2 = Math.round(100 * scale);
  const lineY2 = Math.round(100 * scale);
  const textY = Math.round(64 * scale);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#17494D" stroke="#78A300" stroke-width="${strokeWidth}"/>
  <line x1="${lineX1}" y1="${lineY1}" x2="${lineX2}" y2="${lineY2}" stroke="#78A300" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <text x="${cx}" y="${textY}" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="white" text-anchor="middle">Z</text>
</svg>`;
}

async function generateIcons() {
  const iconsDir = path.join(__dirname, 'icons');
  
  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(iconsDir, `icon${size}.png`);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`Generated icon${size}.png`);
  }
}

generateIcons().catch(console.error);
