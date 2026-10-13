/* Paths to the web images made by scripts/optimize-images.mjs from artwork/<src> */

import sizes from "../data/image-sizes.json";

type Size = "lg" | "md" | "sm";

const base = (src: string) =>
    "/images/" + src.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-");

export const imageUrl = (src: string, size: Size) => `${base(src)}-${size}.webp`;
export const ogImageUrl = (src: string) => `${base(src)}-og.jpg`;

/* width/height of the original, for <img width height> so space is reserved before loading */
export const imageSize = (src: string) => {
    const [width, height] = (sizes as Record<string, number[]>)[src] ?? [];
    return { width, height };
};
