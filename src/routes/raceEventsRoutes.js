const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST / - Create a new race event
router.post('/', async (req, res) => {
    try {
        console.log("📩 Incoming Race Event Data:", req.body);

        const requiredFields = ["eventName"];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({error: `Missing required field: ${field}`});
            }
        }

        // Validate each race's startDateTime
        if (req.body.races) {
            for (const [i, race] of req.body.races.entries()) {
                if (!race.startDateTime) {
                    return res.status(400).json({error: `Missing required field: startDateTime in race #${i + 1}`});
                }
            }
        }

        // Parse dates and validate
        const startDateTime = new Date(req.body.startDateTime);
        const endDateTime = req.body.endDateTime ? new Date(req.body.endDateTime) : null;
        if (endDateTime && endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        let organizerId = req.body.organizerId;

        if (!organizerId && req.body.organizer) {
            const createdOrganizer = await prisma.organizer.create({
                data: {
                    name: req.body.organizer.name,
                    contactPhone: req.body.organizer.contactPhone || null,
                    contactEmail: req.body.organizer.contactEmail || null,
                    organizerSite: req.body.organizer.organizerSite || null,
                }
            });
            organizerId = createdOrganizer.id;
        }

        // Create the race event
        const raceEvent = await prisma.raceEvent.create({
            data: {
                eventName: req.body.eventName,
                description: req.body.description || null,
                mainImage: req.body.mainImage || null,
                gallery: req.body.gallery || [],
                registrationSite: req.body.registrationSite || null,
                socialMedia: req.body.socialMedia || null,
                tags: req.body.tags || [],
                organizerId: organizerId || null, // Link to existing Organizer
                races: req.body.races ? {
                    create: req.body.races.map(race => ({
                        raceName: race.raceName || null,
                        elevation: race.elevation,
                        length: race.length,
                        gpsFile: race.gpsFile || null,
                        startLocation: race.startLocation,
                        startDateTime: new Date(race.startDateTime),
                        endDateTime: race.endDateTime ? new Date(race.endDateTime) : null,
                        competitionId: race.competitionId || null
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

/**
 * raceRoutes.js
 *
 * This file defines the Express routes for managing Race Events in the race timing system.
 * It uses Prisma as an ORM to interact with the database. The routes allow clients to:
 *   - Retrieve all race events
 *   - Create a new race event
 *   - Retrieve a specific race event by ID
 *   - Update an existing race event
 *   - Delete a race event
 *
 * Each race event contains various fields such as eventName, startLocation, startDateTime, endDateTime,
 * contact details, and optionally nested races (each race may include fields like elevation, length, gpsFile).
 */

// GET / - Retrieve all race events, including their nested races if provided
router.get('/', async (req, res) => {
    try {
        const raceEvents = await prisma.raceEvent.findMany({
            include: {
                races: true,
                organizer: true,
            }
        });
        res.json(raceEvents);
    } catch (error) {
        console.error("❌ Error fetching race events:", error);
        res.status(500).json({error: "Failed to fetch race events", details: error.message});
    }
});

// GET /:id - Retrieve a specific race event by its ID, including nested races
router.get('/:id', async (req, res) => {
    try {
        const raceEvent = await prisma.raceEvent.findUnique({
            where: {id: req.params.id},
            include: {races: true, organizer: true}
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

// PUT /:id - Update an existing race event
router.put('/:id', async (req, res) => {
    try {
        console.log("✏️ Updating Race Event Data:", req.body);

        // Parse and validate date fields
        let startDateTime = req.body.startDateTime ? new Date(req.body.startDateTime) : null;
        let endDateTime = req.body.endDateTime ? new Date(req.body.endDateTime) : null;
        if (startDateTime && endDateTime && endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        const updatedRaceEvent = await prisma.raceEvent.update({
            where: {id: req.params.id},
            data: {
                eventName: req.body.eventName,
                description: req.body.description || null,
                mainImage: req.body.mainImage || null,
                gallery: req.body.gallery || [],
                registrationSite: req.body.registrationSite || null,
                socialMedia: req.body.socialMedia || null,
                tags: req.body.tags || [],
                organizerId: req.body.organizerId || null,
                races: req.body.races ? {
                    deleteMany: {}, // Clear existing races
                    create: req.body.races.map(race => ({
                        raceName: race.raceName || null,
                        elevation: race.elevation,
                        length: race.length,
                        gpsFile: race.gpsFile || null,
                        startLocation: race.startLocation,
                        startDateTime: new Date(race.startDateTime),
                        endDateTime: race.endDateTime ? new Date(race.endDateTime) : null,
                        competitionId: race.competitionId || null
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

// DELETE /:id - Delete a race event by its unique ID
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