/*
 * Turns the originals in artwork/ into small web images in public/images/:
 *   <name>-lg.webp  project page        (max 1400px)
 *   <name>-md.webp  portfolio cards     (max 640px)
 *   <name>-sm.webp  gallery thumbnails  (max 160px)
 *   <name>-og.jpg   link preview        (1200×630)
 * Names are lower-cased with spaces turned into dashes – keep in sync with src/lib/images.ts.
 * Runs automatically before `dev` and `build`; unchanged images are skipped.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "artwork";
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
for await (const file of walk(SRC)) {
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
console.log(`optimize-images: ${made} file(s) written to ${OUT}`);
