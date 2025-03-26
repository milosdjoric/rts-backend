const express = require('express');
const {PrismaClient} = require('@prisma/client');
const {validateRaceEvent} = require('../middleware/validateRaceEvent');
const {applyRaceEventFilters} = require('../middleware/applyRaceEventFilters');

const router = express.Router();
const prisma = new PrismaClient();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const originalExt = file.originalname.split('.').pop();
        const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
        const random = Math.floor(Math.random() * 10000); // random number
        const filename = `${today}__${random}.${originalExt}`;
        cb(null, filename);
    }
});
const upload = multer({storage});

// POST /upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No file uploaded'});

    const imageUrl = `http://localhost:5001/uploads/${req.file.filename}`; // Local or change to CDN path
    res.status(201).json({url: imageUrl});
});

// POST / - Create a new race event
router.post('/', validateRaceEvent, async (req, res) => {
    try {
        console.log("📩 Incoming Race Event Data:", req.body);

        // Parse dates and validate
        const startDateTime = new Date(req.body.startDateTime);
        const endDateTime = req.body.endDateTime ? new Date(req.body.endDateTime) : null;
        if (endDateTime && endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        let organizerId = req.body.organizerId;

        if (!organizerId && req.body.organizer) {
            const existing = await prisma.organizer.findFirst({
                where: {
                    name: req.body.organizer.name,
                    contactEmail: req.body.organizer.contactEmail
                }
            });

            if (existing) {
                organizerId = existing.id;
            } else {
                const created = await prisma.organizer.create({
                    data: {
                        name: req.body.organizer.name,
                        contactPhone: req.body.organizer.contactPhone || null,
                        contactEmail: req.body.organizer.contactEmail || null,
                        organizerSite: req.body.organizer.organizerSite || null,
                    }
                });
                organizerId = created.id;
            }
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
                    create: await Promise.all(req.body.races.map(async race => {
                        let competitionId = race.competitionId;

                        if (!competitionId && race.competition) {
                            const existingComp = await prisma.competition.findFirst({
                                where: {
                                    name: race.competition.name
                                }
                            });

                            if (existingComp) {
                                competitionId = existingComp.id;
                            } else {
                                const createdCompetition = await prisma.competition.create({
                                    data: {
                                        name: race.competition.name,
                                        description: race.competition.description || null
                                    }
                                });
                                competitionId = createdCompetition.id;
                            }
                        }

                        return {
                            raceName: race.raceName || null,
                            elevation: race.elevation,
                            length: race.length,
                            gpsFile: race.gpsFile || null,
                            startLocation: race.startLocation,
                            startDateTime: new Date(race.startDateTime),
                            endDateTime: race.endDateTime ? new Date(race.endDateTime) : null,
                            competitionId: competitionId || null
                        };
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
router.get('/', applyRaceEventFilters, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'eventName';
        const order = req.query.order === 'desc' ? 'desc' : 'asc';

        const [raceEvents, totalCount] = await Promise.all([
            prisma.raceEvent.findMany({
                skip,
                take: limit,
                where: req.filters,
                orderBy: {[sortBy]: order},
                include: {
                    races: true,
                    organizer: true,
                }
            }),
            prisma.raceEvent.count()
        ]);

        res.json({
            data: raceEvents,
            meta: {
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                sortBy,
                order,
            }
        });
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
router.put('/:id', validateRaceEvent, async (req, res) => {
    try {
        console.log("✏️ Updating Race Event Data:", req.body);

        // Parse and validate date fields
        let startDateTime = req.body.startDateTime ? new Date(req.body.startDateTime) : null;
        let endDateTime = req.body.endDateTime ? new Date(req.body.endDateTime) : null;
        if (startDateTime && endDateTime && endDateTime <= startDateTime) {
            return res.status(400).json({error: "endDateTime must be after startDateTime"});
        }

        let organizerId = req.body.organizerId;

        if (!organizerId && req.body.organizer) {
            const existing = await prisma.organizer.findFirst({
                where: {
                    name: req.body.organizer.name,
                    contactEmail: req.body.organizer.contactEmail
                }
            });

            if (existing) {
                organizerId = existing.id;
            } else {
                const created = await prisma.organizer.create({
                    data: {
                        name: req.body.organizer.name,
                        contactPhone: req.body.organizer.contactPhone || null,
                        contactEmail: req.body.organizer.contactEmail || null,
                        organizerSite: req.body.organizer.organizerSite || null,
                    }
                });
                organizerId = created.id;
            }
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
                organizerId: organizerId || null,
                races: req.body.races ? {
                    deleteMany: {}, // Clear existing races
                    create: await Promise.all(req.body.races.map(async race => {
                        let competitionId = race.competitionId;

                        if (!competitionId && race.competition) {
                            const existingComp = await prisma.competition.findFirst({
                                where: {name: race.competition.name}
                            });

                            if (existingComp) {
                                competitionId = existingComp.id;
                            } else {
                                const createdCompetition = await prisma.competition.create({
                                    data: {
                                        name: race.competition.name,
                                        description: race.competition.description || null
                                    }
                                });
                                competitionId = createdCompetition.id;
                            }
                        }

                        return {
                            raceName: race.raceName || null,
                            elevation: race.elevation,
                            length: race.length,
                            gpsFile: race.gpsFile || null,
                            startLocation: race.startLocation,
                            startDateTime: new Date(race.startDateTime),
                            endDateTime: race.endDateTime ? new Date(race.endDateTime) : null,
                            competitionId: competitionId || null
                        };
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