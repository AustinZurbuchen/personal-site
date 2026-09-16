// Row add/remove for the four whole-list sections, and the two limits that
// decide when a control is offered.
//
// BOTH LIMITS MIRROR server.py, and mirroring them is the point: the server
// enforces them either way, but a control that produces a guaranteed error is
// worse than no control -- it spends the operator's attention on a failure the
// UI already knew was coming.

// server.py: MAX_ROWS. The largest real list is 17.
export const MAX_ROWS = 60;

// server.py refuses an empty list outright ("must not be empty"), because an
// empty array is a section-wipe and no gesture in this UI should be able to
// produce one. So the last row of a list cannot be removed -- deleting a whole
// section stays a deliberate database operation, like a restore.
export const canRemoveRow = (rows) => Array.isArray(rows) && rows.length > 1;

export const canAddRow = (rows) => Array.isArray(rows) && rows.length < MAX_ROWS;

// A blank row for each list, carrying EXACTLY the keys LIST_SCHEMAS requires --
// no more, no fewer. A missing key and an extra key are both refused, and the
// error names a row the operator never typed into, so these are worth keeping
// beside the schemas they mirror rather than building ad hoc at each call site.
//
// Values are the empty equivalents rather than placeholder prose: a new row is
// something to fill in, and "New ability" saved by accident is worse than a
// blank one, because it looks deliberate.
export const BLANK_ROWS = {
    'experiences.school': () => ({
        company: '', dateLabel: '', title: '', body: '',
    }),
    'experiences.work': () => ({
        company: '', dateLabel: '', title: '', body: '',
        // The three keys sort_work_items reads. Editable since the previous
        // commit, which is what makes adding a work row possible at all.
        startDate: '', endDate: '', isCurrent: false,
    }),
    'abilities.languages': () => ({ ability: '', stars: '0' }),
    'abilities.technologies': () => ({ ability: '', stars: '0' }),
};

// '0' rather than '3' or '5': STARS in server.py accepts '0'-'5', and a new row
// arriving pre-rated would be a number nobody chose. normalizeStars('0') is 0,
// so the radiogroup paints five empty stars and puts the tab stop on the first.
export const blankRowFor = (path) => {
    const make = BLANK_ROWS[path];
    return make ? make() : null;
};
