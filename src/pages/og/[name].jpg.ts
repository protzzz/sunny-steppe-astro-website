import type { APIRoute, GetStaticPaths } from "astro";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { products } from "@data/products";

// Share previews (og:image), 1200×630, built at every build: /og/site.jpg and /og/<product id>.jpg.
// No text on purpose: no fonts are needed on the build machine. Pack shots: src/assets/products/<id>-front.webp.

const W = 1200;
const H = 630;
const asset = (file: string) => path.resolve("src/assets", file);
const front = (id: string) => asset(`products/${id}-front.webp`);

// Cream gradient with a soft gold glow, as on the home page.
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbf7ef"/><stop offset=".6" stop-color="#f7efe0"/><stop offset="1" stop-color="#f3e7d2"/>
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="38%" r="55%">
      <stop offset="0" stop-color="#e2b660" stop-opacity=".32"/><stop offset="1" stop-color="#e2b660" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`;

/** An image scaled to fit the box, centred on (cx, cy). */
const place = async (file: string, box: number, cx: number, cy: number) => {
  const { data, info } = await sharp(file).resize(box, box, { fit: "inside" }).toBuffer({ resolveWithObject: true });
  return { input: data, left: Math.round(cx - info.width / 2), top: Math.round(cy - info.height / 2) };
};

const layouts: Record<string, () => Promise<OverlayOptions[]>> = {
  site: async () => [
    await place(asset("logo-mark.png"), 170, 175, H / 2),
    await place(front("xylitol"), 330, 470, 330),
    await place(front("lollipop"), 360, 750, 315),
    await place(front("gum"), 300, 1015, 345),
  ],
};
for (const p of products) {
  layouts[p.id] = async () => [
    await place(asset("logo-mark.png"), 190, 250, H / 2),
    await place(front(p.id), 540, 790, H / 2),
  ];
}

export const getStaticPaths = (() =>
  Object.keys(layouts).map((name) => ({ params: { name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const image = await sharp(Buffer.from(background))
    .composite(await layouts[params.name!]())
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg" } });
};
