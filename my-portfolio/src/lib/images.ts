/* Paths to the web images made by scripts/optimize-images.mjs from artwork/<src> */

type Size = "lg" | "md" | "sm";

const base = (src: string) =>
    "/images/" + src.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-");

export const imageUrl = (src: string, size: Size) => `${base(src)}-${size}.webp`;
export const ogImageUrl = (src: string) => `${base(src)}-og.jpg`;
