import type { GetStaticPaths, GetStaticProps } from "next";
import Meta from "../components/Meta";
import ProjectDetail from "../components/ProjectDetail";
import { projects, type Project } from "../data/projects";
import { ogImageUrl } from "../lib/images";

/* One page per project (e.g. /nishikigoi) */
export default function ProjectPage({ project }: { project: Project }) {
  return (
      <>
        <Meta
            title={`${project.title} – Mikato`}
            description={project.content.split("\n")[0]}
            path={`/${project.slug}`}
            image={ogImageUrl(project.img)}
        />
        {/* key resets the gallery when moving between projects with back/forward */}
        <ProjectDetail key={project.slug} project={project} />
      </>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: projects.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = ({ params }) => ({
  props: { project: projects.find((p) => p.slug === params?.slug) },
});
