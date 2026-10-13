import { useEffect, useRef } from "react";
import { imageSize, imageUrl, isGif, isVideo, mediaUrl } from "../lib/images";

type Props = {
    src: string;            // path relative to artwork/
    alt: string;
    size?: "lg" | "md";
    className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className">;

/* One piece of artwork: a still image, an animated GIF or a looping video */
export default function Media({ src, alt, size = "lg", className, ...rest }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // React sets `muted` after the element exists, and Safari only autoplays
    // videos that are muted from the start, so start it by hand once mounted.
    // (Low Power Mode still blocks it; Safari then shows its play button.)
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = true;
        v.play().catch(() => {});
    }, [src]);

    if (isVideo(src)) {
        // muted + playsInline is what lets phones autoplay it
        return (
            <video
                ref={videoRef}
                src={mediaUrl(src)}
                poster={imageUrl(src, size)}
                {...imageSize(src)}
                className={className}
                aria-label={alt}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                {...rest}
            />
        );
    }
    return (
        <img
            src={isGif(src) ? mediaUrl(src) : imageUrl(src, size)}
            {...imageSize(src)}
            alt={alt}
            className={className}
            loading={size === "md" ? "lazy" : undefined}
            {...rest}
        />
    );
}
