/*
 * Remembers whether a project page was opened from the grid in this visit.
 * If so, closing it goes *back* in history (so the phone's back gesture and the
 * close button agree); if the visitor landed on the project directly, closing
 * it goes to the home page instead of leaving the site.
 *
 * Also remembers how far the grid was scrolled, so it can be restored when the
 * visitor comes back to it.
 */
let openedFromGrid = false;
let gridScrollY: number | null = null;

export const markOpenedFromGrid = () => {
    openedFromGrid = true;
    gridScrollY = window.scrollY;
};

export const wasOpenedFromGrid = () => openedFromGrid;

export const takeGridScroll = () => {
    const y = gridScrollY;
    gridScrollY = null;
    return y;
};
