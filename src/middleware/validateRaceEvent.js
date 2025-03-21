function validateRaceEvent(req, res, next) {
    const {eventName, races} = req.body;

    if (!eventName) {
        return res.status(400).json({error: "eventName is required"});
    }

    if (races && Array.isArray(races)) {
        for (let i = 0; i < races.length; i++) {
            if (!races[i].startDateTime) {
                return res.status(400).json({error: `Missing startDateTime in race #${i + 1}`});
            }
            if (typeof races[i].length !== 'number') {
                return res.status(400).json({error: `Invalid length in race #${i + 1}`});
            }
        }
    }

    next(); // All good, proceed to controller
}

module.exports = {validateRaceEvent};