/* Paths to the web files made by scripts/optimize-images.mjs from artwork/<src> */

import sizes from "../data/image-sizes.json";

type Size = "lg" | "md" | "sm";

const stem = (src: string) => src.replace(/\.[^.]+$/, "");
const base = (src: string) => "/images/" + stem(src).toLowerCase().replace(/\s+/g, "-");
const ext = (src: string) => (src.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();

export const isVideo = (src: string) => [".mp4", ".webm"].includes(ext(src));
export const isGif = (src: string) => ext(src) === ".gif";

/* a video's still image lives next to it as <name>-poster.png */
export const posterOf = (src: string) => `${stem(src)}-poster.png`;

/* the still image that stands in for any artwork (videos use their poster) */
const still = (src: string) => (isVideo(src) ? posterOf(src) : src);

export const imageUrl = (src: string, size: Size) => `${base(still(src))}-${size}.webp`;
export const ogImageUrl = (src: string) => `${base(still(src))}-og.jpg`;

/* GIFs and videos are served as they are */
export const mediaUrl = (src: string) => `${base(src)}${ext(src)}`;

/* width/height of the original, for width/height attributes so space is reserved before loading */
export const imageSize = (src: string) => {
    const [width, height] = (sizes as Record<string, number[]>)[still(src)] ?? [];
    return { width, height };
};
