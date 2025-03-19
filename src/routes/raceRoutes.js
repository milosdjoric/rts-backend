const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Get all race events
router.get('/', async (req, res) => {
    try {
        const raceEvents = await prisma.raceEvent.findMany({
            include: {races: true}  // include nested races if needed
        });
        res.json(raceEvents);
    } catch (error) {
        console.error("❌ Error fetching race events:", error);
        res.status(500).json({error: "Failed to fetch race events", details: error.message});
    }
});

// ✅ Create a new race event
router.post('/', async (req, res) => {
    try {
        console.log("📩 Incoming Race Event Data:", req.body);

        // Validate required fields for race event
        const requiredFields = [
            "eventName", "organizer", "contactPhone", "contactEmail",
            "startLocation", "startDateTime", "endDateTime", "distance"
        ];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({error: `Missing required field: ${field}`});
            }
        }

        // Parse and validate date/times
        const startDateTime = new Date(req.body.startDateTime);
        const endDateTime = new Date(req.body.endDateTime);
        if (endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        const raceEvent = await prisma.raceEvent.create({
            data: {
                eventName: req.body.eventName,
                description: req.body.description || null,
                mainImage: req.body.mainImage || null,
                gallery: req.body.gallery || [],
                organizer: req.body.organizer,
                contactPhone: req.body.contactPhone,
                contactEmail: req.body.contactEmail,
                organizerSite: req.body.organizerSite || null,
                registrationSite: req.body.registrationSite || null,
                socialMedia: req.body.socialMedia || null,
                startLocation: req.body.startLocation,
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                elevation: req.body.elevation ? Number(req.body.elevation) : null,
                distance: req.body.distance,
                competition: req.body.competition || null,
                tags: req.body.tags || [],
                // Nested creation for races if provided
                races: req.body.races ? {
                    create: req.body.races.map(race => ({
                        elevation: race.elevation,
                        length: race.length,
                        gpsFile: race.gpsFile || null,
                    }))
                } : undefined,
            },
        });

        res.status(201).json(raceEvent);
    } catch (error) {
        console.error("❌ Error creating race event:", error);
        res.status(400).json({error: "Error creating race event", details: error.message});
    }
});

// ✅ Get a single race event by ID
router.get('/:id', async (req, res) => {
    try {
        const raceEvent = await prisma.raceEvent.findUnique({
            where: {id: req.params.id},
            include: {races: true}
        });

        if (!raceEvent) {
            return res.status(404).json({error: "Race event not found"});
        }

        res.json(raceEvent);
    } catch (error) {
        console.error("❌ Error fetching race event:", error);
        res.status(500).json({error: "Failed to fetch race event", details: error.message});
    }
});

// ✅ Update an existing race event
router.put('/:id', async (req, res) => {
    try {
        console.log("✏️ Updating Race Event Data:", req.body);

        // If dates are provided, parse and validate them
        let startDateTime, endDateTime;
        if (req.body.startDateTime && req.body.endDateTime) {
            startDateTime = new Date(req.body.startDateTime);
            endDateTime = new Date(req.body.endDateTime);
            if (endDateTime <= startDateTime) {
                return res.status(400).json({error: "endDateTime must be after startDateTime"});
            }
        }

        const updatedRaceEvent = await prisma.raceEvent.update({
            where: {id: req.params.id},
            data: {
                eventName: req.body.eventName,
                description: req.body.description || null,
                mainImage: req.body.mainImage || null,
                gallery: req.body.gallery || [],
                organizer: req.body.organizer,
                contactPhone: req.body.contactPhone,
                contactEmail: req.body.contactEmail,
                organizerSite: req.body.organizerSite || null,
                registrationSite: req.body.registrationSite || null,
                socialMedia: req.body.socialMedia || null,
                startLocation: req.body.startLocation,
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                elevation: req.body.elevation ? Number(req.body.elevation) : null,
                distance: req.body.distance,
                competition: req.body.competition || null,
                tags: req.body.tags || [],
                // Optionally overwrite nested races if provided
                races: req.body.races ? {
                    deleteMany: {}, // Delete existing nested races
                    create: req.body.races.map(race => ({
                        elevation: race.elevation,
                        length: race.length,
                        gpsFile: race.gpsFile || null,
                    }))
                } : undefined,
            },
        });

        res.json(updatedRaceEvent);
    } catch (error) {
        console.error("❌ Error updating race event:", error);
        res.status(400).json({error: "Error updating race event", details: error.message});
    }
});

// ✅ Delete a race event
router.delete('/:id', async (req, res) => {
    try {
        await prisma.raceEvent.delete({
            where: {id: req.params.id},
        });
        res.json({message: "Race event deleted successfully"});
    } catch (error) {
        console.error("❌ Error deleting race event:", error);
        res.status(400).json({error: "Error deleting race event", details: error.message});
    }
});

module.exports = router;