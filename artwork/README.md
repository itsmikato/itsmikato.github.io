# Artwork

Originals for the site. Nothing in here is published as-is: `npm run dev` / `npm run deploy`
turn it into web-sized files in `public/images/` (see `scripts/optimize-images.mjs`).

## Layout

One folder per project, named like the project's web address (`slug` in `src/data/projects.ts`):

```
artwork/
  good-llama/                 → itsmikato.github.io/good-llama
    good-llama.mp4            the finished piece
    good-llama-poster.png     still frame for the card, thumbnail and link previews
    process/                  sketches, tests, work in progress
      turnaround-1.gif
      turnaround-test.mp4
      turnaround-test-poster.png
  nishikigoi/
    mint.jpg  coral.jpg  …    the cover and the other colourways
  _unused/                    kept, but never published (folders starting with "_" are skipped)
```

## Adding a project

1. Make a folder, e.g. `artwork/new-piece/`, and put the files in it.
   Use lowercase names with dashes: `new-piece.jpg`, not `Untitled (1).JPG`.
2. Images (`.jpg`, `.png`) and GIFs work as they are. Every video (`.mp4`) needs a still
   frame next to it called `<video name>-poster.png`.
3. Add an entry to `src/data/projects.ts` (`img` = cover image, `main` = the finished piece
   if it's a video, `gallery` = more finished pieces, `process` = work in progress).
