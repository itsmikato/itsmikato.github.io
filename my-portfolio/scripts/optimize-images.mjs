/*
 * Turns the originals in artwork/ into small web images in public/images/:
 *   <name>-lg.webp  project page        (max 1400px)
 *   <name>-md.webp  portfolio cards     (max 640px)
 *   <name>-sm.webp  gallery thumbnails  (max 160px)
 *   <name>-og.jpg   link preview        (1200×630, see linkPreview below)
 * GIFs and videos (.gif/.mp4/.webm) are copied as they are: <name>.<ext>.
 * A video's still image (card, thumbnail, link preview) is <name>-poster.png next to it.
 * Folders starting with "_" (e.g. artwork/_unused) are skipped.
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
        if (entry.isDirectory()) {
            if (!entry.name.startsWith("_")) yield* walk(full);
        } else if (/\.(jpe?g|png|gif|mp4|webm)$/i.test(entry.name)) yield full;
    }
}

/*
 * Link preview (1200×630) for artwork that's usually portrait:
 *  1. trim a uniform frame, e.g. the white border around a poster
 *  2. if what's left has a single flat colour along its edge (mint, black,
 *     white…), extend the artwork with that colour so it fills the frame
 *  3. otherwise centre it on the site's dark background
 * (Generative "expand" was tried and invents fake copies of the artwork.)
 */
const PREVIEW = { width: 1200, height: 630, pad: 32 };

// The colour to extend with: the median of the left and right edges (where the
// colour gets extended), if those edges are mostly that colour – lettering or
// shapes touching an edge are fine – and top and bottom roughly agree.
async function edgeColour(buf) {
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const px = (x, y) => {
        const i = (y * w + x) * 3;
        return [data[i], data[i + 1], data[i + 2]];
    };
    const side = { top: [], bottom: [], left: [], right: [] };
    for (let x = 0; x < w; x += 2) { side.top.push(px(x, 0)); side.bottom.push(px(x, h - 1)); }
    for (let y = 0; y < h; y += 2) { side.left.push(px(0, y)); side.right.push(px(w - 1, y)); }

    const sides = [...side.left, ...side.right];
    const median = [0, 1, 2].map((c) => sides.map((p) => p[c]).sort((a, b) => a - b)[sides.length >> 1]);
    const share = (pts) => pts.filter((p) => p.every((v, c) => Math.abs(v - median[c]) <= 24)).length / pts.length;
    const flat =
        share(side.left) >= 0.7 && share(side.right) >= 0.7 &&
        share(side.top) >= 0.5 && share(side.bottom) >= 0.5;
    return flat ? { r: median[0], g: median[1], b: median[2] } : null;
}

async function linkPreview(file) {
    let buf = await sharp(file).flatten({ background: "#ffffff" }).toBuffer();
    const before = await sharp(buf).metadata();
    try {
        buf = await sharp(buf).trim({ threshold: 40 }).toBuffer();
        const after = await sharp(buf).metadata();
        // a frame was removed: shave the soft, blended line along the cut too
        if (after.width < before.width - 8 && after.height < before.height - 8) {
            const inset = 4;
            buf = await sharp(buf)
                .extract({ left: inset, top: inset, width: after.width - 2 * inset, height: after.height - 2 * inset })
                .toBuffer();
        }
    } catch {
        // nothing to trim
    }
    const bg = (await edgeColour(buf)) ?? BG;
    const { width, height, pad } = PREVIEW;
    return sharp(buf)
        .resize(width, height - 2 * pad, { fit: "contain", background: bg })
        .extend({ top: pad, bottom: pad, background: bg })
        .jpeg({ quality: 85, mozjpeg: true });
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
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    const base = path.join(OUT, outName(rel));
    await fs.mkdir(path.dirname(base), { recursive: true });

    // animations: copied as they are (a video takes its size from its poster)
    if (/\.(gif|mp4|webm)$/i.test(file)) {
        if (/\.gif$/i.test(file)) {
            const { width, height } = await sharp(file).metadata();
            dimensions[rel] = [width, height];
        }
        const out = base + path.extname(file).toLowerCase();
        if (!(await isFresh(file, out))) {
            await fs.copyFile(file, out);
            made++;
        }
        continue;
    }

    const { width, height } = await sharp(file).metadata();
    dimensions[rel] = [width, height];

    const jobs = [
        ...Object.entries(SIZES).map(([size, px]) => [
            `${base}-${size}.webp`,
            (img) => img.resize(px, px, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }),
        ]),
        [`${base}-og.jpg`, () => linkPreview(file)],
    ];

    for (const [out, transform] of jobs) {
        if (await isFresh(file, out)) continue;
        await (await transform(sharp(file))).toFile(out);
        made++;
    }
}
// only rewrite the sizes file when something changed (keeps git and dev reloads quiet)
const sorted = Object.fromEntries(Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b)));
const json = JSON.stringify(sorted, null, 2) + "\n";
const previous = await fs.readFile(SIZES_FILE, "utf8").catch(() => "");
if (json !== previous) await fs.writeFile(SIZES_FILE, json);

console.log(`optimize-images: ${made} file(s) written to ${OUT}`);
