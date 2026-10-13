import { useEffect } from "react";
import Link from "next/link";
import { projects } from "../data/projects";
import { imageSize, imageUrl, isVideo } from "../lib/images";
import { markOpenedFromGrid, takeGridScroll } from "../lib/nav";

export default function Portfolio() {
    // back from a project: return to where the visitor was in the grid
    useEffect(() => {
        const y = takeGridScroll();
        if (y !== null) requestAnimationFrame(() => window.scrollTo(0, y));
    }, []);

    return (
        <div className="portfolio-container">
            <div className="portfolio">
                {projects.map((proj) => (
                    <Link
                        key={proj.slug}
                        href={`/${proj.slug}`}
                        className="project"
                        onClick={markOpenedFromGrid}
                    >
                        <img src={imageUrl(proj.img, "md")} {...imageSize(proj.img)} alt={proj.title} />
                        {proj.main && isVideo(proj.main) && (
                            <span className="badge" aria-label="Animated">{"\u25B6\uFE0E"} Animation</span>
                        )}
                        <h3>{proj.title}</h3>
                    </Link>
                ))}
            </div>
        </div>
    );
}
