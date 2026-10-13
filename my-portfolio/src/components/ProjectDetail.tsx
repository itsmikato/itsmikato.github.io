import { useState } from "react";
import { useRouter } from "next/router";

type Project = {
    title: string;
    content: string;
    img: string;          // must start with a leading “/”
    gallery?: string[];
};

type Props = {
    project: Project;
    backToPortfolio: () => void;
};

export default function ProjectDetail({ project, backToPortfolio }: Props) {
    const { basePath } = useRouter();        // "" in dev, "/mik.github.io" in prod
    const images = [project.img, ...(project.gallery ?? [])];
    const [active, setActive] = useState(0);

    // encodeURI handles file names with spaces (e.g. "Pink Koi32.jpg")
    const src = (path: string) => encodeURI(`${basePath}${path}`);

    return (
        <div className="project-detail flex flex-col items-center">
            <button className="back-btn" onClick={backToPortfolio}>
                ← Back
            </button>

            <div className="w-full max-w-3xl mt-16 px-4">
                <img
                    src={src(images[active])}
                    alt={`${project.title} – image ${active + 1} of ${images.length}`}
                    className="w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4"
                />

                {images.length > 1 && (
                    <div className="gallery-thumbs">
                        {images.map((path, idx) => (
                            <button
                                key={path}
                                className={idx === active ? "active" : undefined}
                                onClick={() => setActive(idx)}
                                aria-label={`Show image ${idx + 1} of ${images.length}`}
                                aria-pressed={idx === active}
                            >
                                <img src={src(path)} alt="" loading="lazy" />
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
