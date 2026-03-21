import sharp from "sharp";
import { mkdirSync } from "fs";

// Instagram風のグラデーションアイコン（紫→オレンジ→ピンク）
// 中央に「IP」（InstaPost）のテキスト風デザイン
function generateSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFDC80"/>
      <stop offset="15%" style="stop-color:#F77737"/>
      <stop offset="35%" style="stop-color:#F56040"/>
      <stop offset="55%" style="stop-color:#FD1D1D"/>
      <stop offset="70%" style="stop-color:#E1306C"/>
      <stop offset="85%" style="stop-color:#C13584"/>
      <stop offset="100%" style="stop-color:#833AB4"/>
    </linearGradient>
    <linearGradient id="inner" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFDC80;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#833AB4;stop-opacity:0.3"/>
    </linearGradient>
  </defs>
  <!-- 背景の角丸四角 -->
  <rect width="512" height="512" rx="115" ry="115" fill="url(#bg)"/>

  <!-- カメラ風の外枠（角丸四角） -->
  <rect x="90" y="90" width="332" height="332" rx="75" ry="75" fill="none" stroke="white" stroke-width="28"/>

  <!-- 中央の円（レンズ） -->
  <circle cx="256" cy="256" r="90" fill="none" stroke="white" stroke-width="28"/>

  <!-- 右上のフラッシュドット -->
  <circle cx="370" cy="142" r="24" fill="white"/>

  <!-- 下部に小さく「AI」テキスト -->
  <text x="256" y="460" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="52" fill="white" opacity="0.95">AI</text>
</svg>`;
}

const sizes = [192, 512, 180];
const publicDir = "public";

try { mkdirSync(`${publicDir}/icons`, { recursive: true }); } catch {}

for (const size of sizes) {
  const svg = generateSvg(512);
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`${publicDir}/icons/icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.png`);
}

// favicon用
const svg = generateSvg(512);
await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toFile(`${publicDir}/favicon.png`);
console.log("Generated favicon.png");

console.log("Done!");
