function buildDynamicFilters(query) {
    const where = {};
    const raceFilters = {};

    for (const key in query) {
        const value = query[key];
        const match = key.match(/^(.+?)_(contains|startsWith|endsWith|gte|lte|eq)$/);

        if (match) {
            const [, field, operator] = match;

            const formattedValue =
                ['gte', 'lte', 'eq'].includes(operator) && !isNaN(value)
                    ? parseFloat(value)
                    : field.toLowerCase().includes('date')
                        ? new Date(value)
                        : value;

            const condition = {[operator === 'eq' ? undefined : operator]: formattedValue};
            const filter = {[field]: operator === 'eq' ? formattedValue : condition};

            if (['elevation', 'length', 'startLocation', 'startDateTime', 'endDateTime', 'gpsFile', 'competitionId'].includes(field)) {
                Object.assign(raceFilters, filter);
            } else {
                Object.assign(where, filter);
            }
        } else {
            const filter = {[key]: isNaN(value) ? value : parseFloat(value)};
            Object.assign(where, filter);
        }
    }

    if (Object.keys(raceFilters).length) {
        where.races = {some: raceFilters};
    }

    return where;
}

function applyRaceEventFilters(req, res, next) {
    req.filters = buildDynamicFilters(req.query);
    next();
}

module.exports = {
    applyRaceEventFilters
};