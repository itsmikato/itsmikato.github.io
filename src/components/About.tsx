import { useSyncExternalStore } from "react";
import {
    ABOUT_TEXT,
    EMAIL_DOMAIN,
    EMAIL_SUBJECT,
    EMAIL_USER,
    INSTAGRAM_HANDLE,
    INSTAGRAM_URL,
} from "../data/site";

// put the address together in the browser only (see src/data/site.ts):
// null while rendering the static HTML, the real address once in the browser
const noSubscribe = () => () => {};
const browserEmail = () => `${EMAIL_USER}@${EMAIL_DOMAIN}`;
const noEmail = () => null;

export default function About() {
    const email = useSyncExternalStore(noSubscribe, browserEmail, noEmail);

    return (
        <section id="about" className="about">
            <h2>About</h2>
            {ABOUT_TEXT.map((para) => (
                <p key={para}>{para}</p>
            ))}

            <div className="about-links">
                {email && (
                    <a
                        className="email-btn"
                        href={`mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`}
                    >
                        {email}
                    </a>
                )}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                    @{INSTAGRAM_HANDLE} on Instagram
                </a>
            </div>
        </section>
    );
}
