const slugify = require('slugify');

function generateRaceSlug(eventName, startDateTime) {
    const base = slugify(eventName || 'race-event', {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
    });

    const date = new Date(startDateTime);
    const year = isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    // const firstRaceStart = req.body.races?.[0]?.startDateTime;


    return `${base}-${year}`;
}

module.exports = {generateRaceSlug};