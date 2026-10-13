import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Jost } from "next/font/google";

/* Free, Futura-inspired fallback – self-hosted by next/font at build time */
const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-jost: ${jost.style.fontFamily};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
