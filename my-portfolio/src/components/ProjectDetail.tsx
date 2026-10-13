import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Project } from "../data/projects";
import { imageUrl } from "../lib/images";
import { wasOpenedFromGrid } from "../lib/nav";

export default function ProjectDetail({ project }: { project: Project }) {
    const router = useRouter();
    const images = [project.img, ...(project.gallery ?? [])];
    const [active, setActive] = useState(0);

    // guard: one tap can reach both the ✕ and the backdrop, and going back
    // twice would leave the site
    const closing = useRef(false);
    const backToPortfolio = useCallback(() => {
        if (closing.current) return;
        closing.current = true;
        if (wasOpenedFromGrid()) router.back();
        else router.push("/", undefined, { scroll: false });
    }, [router]);

    // step through the gallery, wrapping around at either end
    const step = useCallback(
        (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length),
        [images.length],
    );

    // Esc closes the page, arrow keys switch images
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") backToPortfolio();
            else if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [backToPortfolio, step]);

    // keep the grid from scrolling behind the open project
    useEffect(() => {
        document.body.classList.add("detail-open");
        return () => document.body.classList.remove("detail-open");
    }, []);

    // swipe left/right on the main image to switch images
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const onTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || images.length < 2) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    };

    // clicks on the artwork or thumbnails shouldn't close the page
    const keepOpen = (e: React.MouseEvent) => e.stopPropagation();

    return (
        // tapping anywhere outside the artwork closes the page
        <div className="project-detail flex flex-col items-center" onClick={backToPortfolio}>
            {/* the click bubbles to the backdrop, which closes the page */}
            <button className="close-btn" aria-label="Close">
                ✕
            </button>

            <div className="w-full max-w-3xl mt-16 px-4">
                <img
                    src={imageUrl(images[active], "lg")}
                    alt={`${project.title} – image ${active + 1} of ${images.length}`}
                    className="main-image w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4"
                    onClick={keepOpen}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    draggable={false}
                />

                {images.length > 1 && (
                    <div className="gallery-thumbs" onClick={keepOpen}>
                        {images.map((path, idx) => (
                            <button
                                key={path}
                                className={idx === active ? "active" : undefined}
                                onClick={() => setActive(idx)}
                                aria-label={`Show image ${idx + 1} of ${images.length}`}
                                aria-pressed={idx === active}
                            >
                                <img src={imageUrl(path, "sm")} alt="" />
                            </button>
                        ))}
                    </div>
                )}

                <h2 className="text-3xl font-semibold mt-4 mb-4">
                    {project.title}
                </h2>

                <p className="text-lg leading-relaxed whitespace-pre-line">
                    {project.content}
                </p>
            </div>
        </div>
    );
}
