/*
 * Turns the originals in artwork/ into small web images in public/images/:
 *   <name>-lg.webp  project page        (max 1400px)
 *   <name>-md.webp  portfolio cards     (max 640px)
 *   <name>-sm.webp  gallery thumbnails  (max 160px)
 *   <name>-og.jpg   link preview        (1200×630)
 * Names are lower-cased with spaces turned into dashes – keep in sync with src/lib/images.ts.
 * Also writes src/data/image-sizes.json (width/height of each original) so pages can
 * reserve the right space before an image loads.
 * Runs automatically before `dev` and `build`; unchanged images are skipped.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "artwork";
const SIZES_FILE = "src/data/image-sizes.json";
const OUT = "public/images";
const SIZES = { lg: 1400, md: 640, sm: 160 };
const BG = "#0e0e0e";

const outName = (rel) => rel.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-");

async function* walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (/\.(jpe?g|png)$/i.test(entry.name)) yield full;
    }
}

const isFresh = async (src, out) => {
    try {
        return (await fs.stat(out)).mtimeMs >= (await fs.stat(src)).mtimeMs;
    } catch {
        return false;
    }
};

let made = 0;
const dimensions = {};
for await (const file of walk(SRC)) {
    const { width, height } = await sharp(file).metadata();
    dimensions[path.relative(SRC, file).split(path.sep).join("/")] = [width, height];

    const base = path.join(OUT, outName(path.relative(SRC, file)));
    await fs.mkdir(path.dirname(base), { recursive: true });

    const jobs = [
        ...Object.entries(SIZES).map(([size, px]) => [
            `${base}-${size}.webp`,
            (img) => img.resize(px, px, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }),
        ]),
        [
            `${base}-og.jpg`,
            (img) => img
                .resize(1200, 630, { fit: "contain", background: BG })
                .flatten({ background: BG })
                .jpeg({ quality: 82, mozjpeg: true }),
        ],
    ];

    for (const [out, transform] of jobs) {
        if (await isFresh(file, out)) continue;
        await transform(sharp(file)).toFile(out);
        made++;
    }
}
// only rewrite the sizes file when something changed (keeps git and dev reloads quiet)
const sorted = Object.fromEntries(Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b)));
const json = JSON.stringify(sorted, null, 2) + "\n";
const previous = await fs.readFile(SIZES_FILE, "utf8").catch(() => "");
if (json !== previous) await fs.writeFile(SIZES_FILE, json);

console.log(`optimize-images: ${made} file(s) written to ${OUT}`);
