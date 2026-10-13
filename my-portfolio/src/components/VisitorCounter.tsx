import { useEffect } from "react";
import Script from "next/script";
import Router from "next/router";
import { GOATCOUNTER_CODE } from "../data/site";

declare global {
    interface Window {
        goatcounter?: { count: (vars?: { path?: string }) => void };
    }
}

/* one count per page shown – including pages opened without a full reload */
const countPage = () => window.goatcounter?.count({ path: location.pathname });

/*
 * GoatCounter: no cookies and no personal data, so no cookie banner is needed.
 * Visits from localhost aren't counted, so testing doesn't skew the numbers.
 */
export default function VisitorCounter() {
    useEffect(() => {
        Router.events.on("routeChangeComplete", countPage);
        return () => Router.events.off("routeChangeComplete", countPage);
    }, []);

    if (!GOATCOUNTER_CODE) return null;
    return (
        <Script
            src="https://gc.zgo.at/count.js"
            data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
            // counting is done by hand (countPage) so client-side navigation counts too
            data-goatcounter-settings='{"no_onload": true}'
            strategy="afterInteractive"
            onLoad={countPage}
        />
    );
}
