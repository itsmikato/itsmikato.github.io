import { useRouter } from "next/router";   // ← NEW

type Project = {
    title: string;
    content: string;
    img: string;          // must start with a leading “/”
};

type Props = {
    project: Project;
    backToPortfolio: () => void;
};

export default function ProjectDetail({ project, backToPortfolio }: Props) {
    const { basePath } = useRouter();        // "" in dev, "/mik.github.io" in prod
    const imgSrc = `${basePath}${project.img}`;

    return (
        <div className="project-detail flex flex-col items-center">
            <button className="back-btn" onClick={backToPortfolio}>
                ← Back
            </button>

            <div className="w-full max-w-3xl mt-16 px-4">
                <img
                    src={imgSrc}                       /* ← prefixed path */
                    alt={`${project.title} screenshot`}
                    className="w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-8"
                />

                <h2 className="text-3xl font-semibold mb-4">
                    {project.title}
                </h2>

                <p className="text-lg leading-relaxed whitespace-pre-line">
                    {project.content}
                </p>
            </div>
        </div>
    );
}
