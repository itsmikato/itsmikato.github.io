import { useEffect, useState } from "react";
import {
    ABOUT_TEXT,
    EMAIL_DOMAIN,
    EMAIL_SUBJECT,
    EMAIL_USER,
    INSTAGRAM_HANDLE,
    INSTAGRAM_URL,
} from "../data/site";

export default function About() {
    // put the address together in the browser only (see src/data/site.ts)
    const [email, setEmail] = useState<string | null>(null);
    useEffect(() => setEmail(`${EMAIL_USER}@${EMAIL_DOMAIN}`), []);

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
