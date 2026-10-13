/* Image paths are relative to artwork/ (see src/lib/images.ts) */

export type Project = {
    slug: string;           // page address: itsmikato.github.io/<slug>
    title: string;
    content: string;
    img: string;            // cover image
    gallery?: string[];     // extra images shown on the project page
};

export const projects: Project[] = [
    {
        slug: "nishikigoi",
        title: "Nishikigoi",
        content:
            "錦鯉 – “brocaded carp”, the Japanese name for ornamental koi.\n\n" +
            "A poster series built around a single hand-drawn koi, its scales and fins " +
            "worked into bold black patterns. The same fish is repeated across five " +
            "colourways (mint, coral, sand, navy and teal), with the kanji stacked in " +
            "fading rows at opposite corners.",
        img: "koi.jpg",
        gallery: [
            "koi/Pink Koi32.jpg",
            "koi/Pink Koi33.jpg",
            "koi/Pink Koi34.jpg",
            "koi/Pink Koi35.jpg",
        ],
    },
    {
        slug: "agamemnon",
        title: "Agamemnon",
        content:
            "Named after Graphium agamemnon, the tailed jay butterfly.\n\n" +
            "Its spotted wings are cut into flat, translucent layers of mint and grey " +
            "and set against sweeping violet curves, so the butterfly seems to settle " +
            "right where the shapes meet.",
        img: "agame.jpg",
    },
    {
        slug: "flow",
        title: "Flow",
        content:
            "A set of fine-line tattoo designs.\n\n" +
            "Plants grow, curl and droop from a single horizon line: arching stems " +
            "ending in heart-shaped leaves, a spiralling fern, flowers in slender vases. " +
            "Some are left as pure linework, others get a soft wash of green or violet.",
        img: "tattoos/Flow_1.jpg",
        gallery: ["tattoos/Flow_2.jpg", "tattoos/Flow_3.jpg"],
    },
];
