import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { Project } from "../data/projects";
import { imageUrl } from "../lib/images";
import { wasOpenedFromGrid } from "../lib/nav";

export default function ProjectDetail({ project }: { project: Project }) {
    const router = useRouter();
    const images = [project.img, ...(project.gallery ?? [])];
    const [active, setActive] = useState(0);

    const backToPortfolio = useCallback(() => {
        if (wasOpenedFromGrid()) router.back();
        else router.push("/", undefined, { scroll: false });
    }, [router]);

    // Esc closes the page
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && backToPortfolio();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [backToPortfolio]);

    // clicks on the artwork or thumbnails shouldn't close the page
    const keepOpen = (e: React.MouseEvent) => e.stopPropagation();

    return (
        // tapping anywhere outside the artwork closes the page
        <div className="project-detail flex flex-col items-center" onClick={backToPortfolio}>
            <button className="close-btn" onClick={backToPortfolio} aria-label="Close">
                ✕
            </button>

            <div className="w-full max-w-3xl mt-16 px-4">
                <img
                    src={imageUrl(images[active], "lg")}
                    alt={`${project.title} – image ${active + 1} of ${images.length}`}
                    className="w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4"
                    onClick={keepOpen}
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
