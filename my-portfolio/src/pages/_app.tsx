import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Jost } from "next/font/google";
import CanvasBackground from "../components/CanvasBackground";

/* Free, Futura-inspired fallback – self-hosted by next/font at build time */
const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "600"] });

/* Shared by every page, so the background keeps animating between pages */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-jost: ${jost.style.fontFamily};
        }
      `}</style>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-512.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0e0e0e" />
      </Head>

      <CanvasBackground />

      <h1 className="title">Mikato</h1>
      <a
          className="insta-link"
          href="https://www.instagram.com/mikatonana/"
          target="_blank"
          rel="noopener noreferrer"
      >
        @mikatonana
      </a>

      <Component {...pageProps} />
    </>
  );
}
