import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import localFont from "next/font/local";
import CanvasBackground from "../components/CanvasBackground";
import VisitorCounter from "../components/VisitorCounter";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../data/site";

/* Jost: a free (OFL, see src/fonts/) Futura-inspired fallback for visitors without
   Futura. Kept in the repo rather than fetched from Google Fonts at build time,
   so builds don't depend on (or fail because of) Google's servers. */
const jost = localFont({
  src: "../fonts/jost-latin-variable.woff2",
  weight: "100 900",
  display: "swap",
});

/* Layout shared by every page; the background and header only show on the grid */
export default function App({ Component, pageProps }: AppProps) {
  const isHome = useRouter().pathname === "/";

  return (
    <>
      <style jsx global>{`
        :root {
          --font-jost: ${jost.style.fontFamily};
        }
      `}</style>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-512.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0e0e0e" />
      </Head>

      {isHome && (
        <>
          <CanvasBackground />
          <header className="site-header">
            <h1 className="title">Mikato</h1>
            <nav className="header-links">
              <a href="#about">About</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                @{INSTAGRAM_HANDLE}
              </a>
            </nav>
          </header>
        </>
      )}

      <Component {...pageProps} />
      <VisitorCounter />
    </>
  );
}
