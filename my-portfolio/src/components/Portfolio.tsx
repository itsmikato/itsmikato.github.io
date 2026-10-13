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
        title: "Project One",
        content: "Detailed content for Project One",
        img: "/resources/koi.jpg",
        gallery: [
            "/resources/koi/Pink Koi32.jpg",
            "/resources/koi/Pink Koi33.jpg",
            "/resources/koi/Pink Koi34.jpg",
            "/resources/koi/Pink Koi35.jpg",
        ],
    },
    { title: "Project Two", content: "Detailed content for Project Two", img: "/resources/agame.jpg" },
    {
        title: "Project Three",
        content: "Detailed content for Project Three",
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
