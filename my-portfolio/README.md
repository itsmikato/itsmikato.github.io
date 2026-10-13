# Mikato – portfolio

Personal art portfolio built with Next.js and statically exported to GitHub Pages:
https://mikototo.github.io/mik.github.io/

## Develop

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

```bash
npm run deploy
```

Builds a static export into `out/` and publishes it to the `gh-pages` branch.
Asset paths are prefixed with `/mik.github.io` in production (see `next.config.ts`),
so reference images as `${basePath}/resources/...` (see `Portfolio.tsx`).

## Where things live

- `src/components/Portfolio.tsx` – project list (titles, descriptions, images)
- `src/components/CanvasBackground.tsx` – animated background
- `src/styles/globals.css` – site styles
- `public/resources/` – artwork images
