import Link from "next/link";
import { projects } from "../data/projects";
import { imageUrl } from "../lib/images";
import { markOpenedFromGrid } from "../lib/nav";

export default function Portfolio() {
    return (
        <div className="portfolio-container">
            <div className="portfolio">
                {projects.map((proj) => (
                    <Link
                        key={proj.slug}
                        href={`/${proj.slug}`}
                        scroll={false}
                        className="project"
                        onClick={markOpenedFromGrid}
                    >
                        <img src={imageUrl(proj.img, "md")} alt={proj.title} />
                        <h3>{proj.title}</h3>
                    </Link>
                ))}
            </div>
        </div>
    );
}
