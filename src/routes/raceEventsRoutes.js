const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST / - Create a new race event
// Expected request body fields:
//   eventName: String (required) - Name of the event
//   startLocation: String (required) - Starting location of the event
//   startDateTime: String (required) - Start date and time in a valid date format
//   endDateTime: String (optional) - End date and time in a valid date format (if provided, must be after startDateTime)
//   description: String (optional) - Description of the event
//   mainImage: String (optional) - URL/path to the main image
//   gallery: Array (optional) - Array of image URLs/paths
//   organizer: String (optional) - Organizer info (if used)
//   contactPhone: String (optional) - Contact phone number
//   contactEmail: String (optional) - Contact email address
//   organizerSite: String (optional) - URL of the organizer's site
//   registrationSite: String (optional) - URL for registration
//   socialMedia: String (optional) - Social media links/info
//   competition: String (optional) - Competition details
//   tags: Array (optional) - Tags related to the event
//   races: Array (optional) - Nested races information; each race may include:
//            elevation: Number (optional) - Elevation data for the race
//            length: String (optional) - Race length
//            gpsFile: String (optional) - GPS file path/URL
router.post('/', async (req, res) => {
    try {
        console.log("📩 Incoming Race Event Data:", req.body);

        // Validate that all required fields are present in the request body
        const requiredFields = [
            "eventName", "startLocation", "startDateTime"
        ];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({error: `Missing required field: ${field}`});
            }
        }

        // Parse the startDateTime and endDateTime from the request body and validate that endDateTime is after startDateTime
        const startDateTime = new Date(req.body.startDateTime);
        const endDateTime = new Date(req.body.endDateTime);
        if (endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        // Create the race event in the database using Prisma. If nested races are provided, they are created as well.
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
            include: {races: true}  // include nested races if needed
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

// PUT /:id - Update an existing race event
// The request body can include updated values for the event fields. Date fields, if provided, are validated to ensure proper order.
// If nested races are included, they overwrite the existing races data.
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