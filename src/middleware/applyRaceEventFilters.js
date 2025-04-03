function buildDynamicFilters(query) {
    const where = {};
    const raceFilters = {};
    const specialKeys = ['page', 'limit', 'sortBy', 'order'];

    for (const key in query) {
        if (specialKeys.includes(key)) continue;

        if (key === 'tags_in') {
            const tags = query[key].split(',').map(tag => tag.trim());
            where.tags = {hasSome: tags};
            continue;
        }

        if (key === 'competitionIds_in') {
            const ids = query[key].split(',').map(id => id.trim());
            raceFilters.competitionId = {in: ids};
            continue;
        }

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

            let condition;
            if (['contains', 'startsWith', 'endsWith'].includes(operator)) {
                condition = {[operator]: formattedValue, mode: 'insensitive'};
            } else {
                condition = {[operator === 'eq' ? undefined : operator]: formattedValue};
            }
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

    if (query.length_gte || query.length_lte) {
        raceFilters.length = {
            ...(query.length_gte && {gte: parseFloat(query.length_gte)}),
            ...(query.length_lte && {lte: parseFloat(query.length_lte)})
        };
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