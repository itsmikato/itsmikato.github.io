# Mikato – portfolio

Personal art portfolio built with Next.js and statically exported to GitHub Pages:
https://itsmikato.github.io/

Visitor stats (GoatCounter, cookie-free): https://itsmikato.goatcounter.com –
the counter's code is set in `src/data/site.ts` (`GOATCOUNTER_CODE`).

## Develop

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

Push to `main` – a GitHub Action (`.github/workflows/deploy.yml`) builds the site and
publishes it to GitHub Pages, usually within two minutes. Progress shows in the repo's
Actions tab. To check the build locally first: `npm run build` (output in `out/`).

## Where things live

- `src/data/projects.ts` – projects: titles, descriptions, artwork and process
- `src/data/site.ts` – about text, email and Instagram
- `src/components/CanvasBackground.tsx` – animated background
- `src/styles/globals.css` – site styles
- `artwork/` – original artwork, one folder per project (see `artwork/README.md`)
