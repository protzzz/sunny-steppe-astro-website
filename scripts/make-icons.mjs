// Site icons from src/assets/logo-mark.png: favicon.ico (16/32/48), apple-touch-icon.png and
// icon-192.png (site.webmanifest), all in public/. No 512px: the logo is only 213px wide.
// Rerun after the logo changes: npm run icons
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const LOGO = "src/assets/logo-mark.png";
const CREAM = "#fbf7ef"; // iOS fills transparency with black

const square = (size, background) => sharp(LOGO).resize(size, size, { fit: "contain", background }).png().toBuffer();

// ICO with PNG images inside: 6-byte header, a 16-byte entry per image, then the images.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => square(s, { r: 0, g: 0, b: 0, alpha: 0 })));
const header = Buffer.from([0, 0, 1, 0, sizes.length, 0]);
let offset = header.length + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s, 0);
  entry.writeUInt8(s, 1);
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngs[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return entry;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));
writeFileSync("public/apple-touch-icon.png", await square(180, CREAM));
writeFileSync("public/icon-192.png", await square(192, { r: 0, g: 0, b: 0, alpha: 0 }));
console.log("Icons written: favicon.ico, apple-touch-icon.png, icon-192.png");
