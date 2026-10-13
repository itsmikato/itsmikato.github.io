import Head from "next/head";

export const SITE_URL = "https://itsmikato.github.io";

type Props = {
    title: string;
    description: string;
    path: string;           // e.g. "/" or "/flow"
    image: string;          // site-relative, e.g. "/images/koi-og.jpg"
};

/* Page title plus the tags that make shared links show a preview card */
export default function Meta({ title, description, path, image }: Props) {
    const url = SITE_URL + path;
    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Mikato" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:image" content={SITE_URL + image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
    );
}
