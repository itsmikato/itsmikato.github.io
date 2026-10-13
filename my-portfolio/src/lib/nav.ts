/*
 * Remembers whether a project page was opened from the grid in this visit.
 * If so, closing it goes *back* in history (so the phone's back gesture and the
 * close button agree); if the visitor landed on the project directly, closing
 * it goes to the home page instead of leaving the site.
 */
let openedFromGrid = false;

export const markOpenedFromGrid = () => {
    openedFromGrid = true;
};

export const wasOpenedFromGrid = () => openedFromGrid;
