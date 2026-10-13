import Meta from "../components/Meta";
import Portfolio from "../components/Portfolio";
import { projects } from "../data/projects";
import { ogImageUrl } from "../lib/images";

export default function Home() {
  return (
      <>
        <Meta
            title="Mikato"
            description="Mikato – illustration, poster and tattoo designs."
            path="/"
            image={ogImageUrl(projects[0].img)}
        />
        <Portfolio />
      </>
  );
}
