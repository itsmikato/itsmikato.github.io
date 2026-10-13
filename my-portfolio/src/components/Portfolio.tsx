import { useState } from "react";
import ProjectDetail from "./ProjectDetail";

type Project = {
    title: string;
    content: string;
    img: string;            // must start with a leading “/”
    gallery?: string[];     // extra images shown on the project page
};

const projects: Project[] = [
    {
        title: "Nishikigoi",
        content:
            "錦鯉 – “brocaded carp”, the Japanese name for ornamental koi.\n\n" +
            "A poster series built around a single hand-drawn koi, its scales and fins " +
            "worked into bold black patterns. The same fish is repeated across five " +
            "colourways (mint, coral, sand, navy and teal), with the kanji stacked in " +
            "fading rows at opposite corners.",
        img: "/resources/koi.jpg",
        gallery: [
            "/resources/koi/Pink Koi32.jpg",
            "/resources/koi/Pink Koi33.jpg",
            "/resources/koi/Pink Koi34.jpg",
            "/resources/koi/Pink Koi35.jpg",
        ],
    },
    {
        title: "Agamemnon",
        content:
            "Named after Graphium agamemnon, the tailed jay butterfly.\n\n" +
            "Its spotted wings are cut into flat, translucent layers of mint and grey " +
            "and set against sweeping violet curves, so the butterfly seems to settle " +
            "right where the shapes meet.",
        img: "/resources/agame.jpg",
    },
    {
        title: "Flow",
        content:
            "A set of fine-line tattoo designs.\n\n" +
            "Plants grow, curl and droop from a single horizon line: arching stems " +
            "ending in heart-shaped leaves, a spiralling fern, flowers in slender vases. " +
            "Some are left as pure linework, others get a soft wash of green or violet.",
        img: "/resources/tattoos/Flow_1.jpg",
        gallery: ["/resources/tattoos/Flow_2.jpg", "/resources/tattoos/Flow_3.jpg"],
    },
];

export default function Portfolio() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const loadProject = (project: Project) => setSelectedProject(project);
    const backToPortfolio = () => setSelectedProject(null);

    return (
        <>
            <div className="portfolio">
                {projects.map((proj, idx) => (
                    <div key={idx} className="project" onClick={() => loadProject(proj)}>
                        <img src={encodeURI(proj.img)} alt={proj.title} />
                        <h3>{proj.title}</h3>
                    </div>
                ))}
            </div>

            {selectedProject && (
                <ProjectDetail project={selectedProject} backToPortfolio={backToPortfolio} />
            )}
        </>
    );
}
