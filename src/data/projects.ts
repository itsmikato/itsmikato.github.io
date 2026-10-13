/*
 * One folder per project in artwork/, named like the slug. Paths below are
 * relative to artwork/. Images (.jpg/.png), GIFs and videos (.mp4) all work;
 * a video needs a still next to it named <video>-poster.png.
 */

export type ProcessItem = {
    src: string;
    caption?: string;
};

export type Project = {
    slug: string;           // page address: itsmikato.github.io/<slug>
    title: string;
    content: string;
    img: string;            // cover: a still image for the card and link previews
    main?: string;          // the finished piece if it isn't the cover (e.g. a video)
    gallery?: string[];     // more finished pieces, switchable with thumbnails
    process?: ProcessItem[]; // sketches, tests, work in progress
};

export const projects: Project[] = [
    {
        slug: "good-llama",
        title: "Good Llama",
        content:
            "Good morning, good llama.\n\n" +
            "A hand-drawn llama – black, with fine outlines and patches of deep blue – " +
            "set inside a ring of teal lettering. The drawing is made by hand; the " +
            "five-second turnaround loop was then animated with AI. Made in a vertical " +
            "9:16 format, the shape of a phone screen.",
        img: "good-llama/good-llama-poster.png",
        main: "good-llama/good-llama.mp4",
        process: [
            { src: "good-llama/process/turnaround-1.gif", caption: "Turnaround test 1" },
            { src: "good-llama/process/turnaround-2.gif", caption: "Turnaround test 2" },
            { src: "good-llama/process/turnaround-test.mp4", caption: "First animated turnaround" },
            { src: "good-llama/process/lettering-test.mp4", caption: "Early version with the lettering" },
        ],
    },
    {
        slug: "nishikigoi",
        title: "Nishikigoi",
        content:
            "錦鯉 – “brocaded carp”, the Japanese name for ornamental koi.\n\n" +
            "A poster series built around a single hand-drawn koi, its scales and fins " +
            "worked into bold black patterns. The same fish is repeated across five " +
            "colourways (mint, coral, sand, navy and teal), with the kanji stacked in " +
            "fading rows at opposite corners.",
        img: "nishikigoi/mint.jpg",
        gallery: [
            "nishikigoi/coral.jpg",
            "nishikigoi/sand.jpg",
            "nishikigoi/navy.jpg",
            "nishikigoi/teal.jpg",
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
        img: "agamemnon/agamemnon.jpg",
    },
    {
        slug: "flow",
        title: "Flow",
        content:
            "A set of fine-line tattoo designs.\n\n" +
            "Plants grow, curl and droop from a single horizon line: arching stems " +
            "ending in heart-shaped leaves, a spiralling fern, flowers in slender vases. " +
            "Some are left as pure linework, others get a soft wash of green or violet.",
        img: "flow/flow-1.jpg",
        gallery: ["flow/flow-2.jpg", "flow/flow-3.jpg"],
    },
];
