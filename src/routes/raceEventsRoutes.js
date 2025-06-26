const {S3Client, PutObjectCommand} = require("@aws-sdk/client-s3");
const {generateRaceSlug} = require('../middleware/generateSlug');

const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
console.log("🧪 S3_REGION:", process.env.S3_REGION);
const express = require('express');
const {PrismaClient} = require('@prisma/client');
const {validateRaceEvent} = require('../middleware/validateRaceEvent');
const {applyRaceEventFilters} = require('../middleware/applyRaceEventFilters');
const {imageUpload, gpsUpload} = require('../middleware/upload');
const router = express.Router();
const prisma = new PrismaClient();
const {competition} = new PrismaClient(); // Added line

// POST /upload-image
router.post('/upload-image', imageUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No file uploaded'});

    try {
        const ext = req.file.originalname.split('.').pop();
        const fileName = `${new Date().toISOString().slice(0, 10)}__${Math.floor(Math.random() * 10000)}.${ext}`;

        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${fileName}`;
        res.status(201).json({url: fileUrl});
    } catch (err) {
        console.error("❌ S3 Image Upload Error:", {
            message: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack
        });
        res.status(500).json({
            error: "Failed to upload image to S3",
            details: err.message,
            code: err.code || null,
            name: err.name || null
        });
    }
});

// POST /upload-gps
router.post('/upload-gps', gpsUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No GPS file uploaded'});

    try {
        const ext = req.file.originalname.split('.').pop();
        const fileName = `${new Date().toISOString().slice(0, 10)}__${Math.floor(Math.random() * 10000)}.${ext}`;

        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${fileName}`;
        res.status(201).json({url: fileUrl});
    } catch (err) {
        console.error("❌ S3 Upload Error:", {
            message: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack
        });
        res.status(500).json({
            error: "Failed to upload file to S3",
            details: err.message,
            code: err.code || null,
            name: err.name || null
        });
    }
});

// POST / - Create a new race event
router.post('/', validateRaceEvent, async (req, res) => {
    try {
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
        const uuid = require('crypto').randomUUID();
        const firstRaceStart = req.body.races?.[0]?.startDateTime;
        let baseSlug = generateRaceSlug(req.body.eventName, firstRaceStart);
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.raceEvent.findUnique({where: {slug}})) {
            slug = `${baseSlug}-duplicate${counter > 1 ? `-${counter}` : ''}`;
            counter++;
        }

        const raceEvent = await prisma.raceEvent.create({
            data: {
                id: uuid,
                eventName: req.body.eventName,
                slug: slug,
                type: req.body.type,
                description: req.body.description || null,
                mainImage: req.body.mainImage || null,
                gallery: req.body.gallery || [],
                registrationSite: req.body.registrationSite || null,
                socialMedia: Array.isArray(req.body.socialMedia)
                    ? req.body.socialMedia.filter(item => typeof item === 'string')
                    : [],
                tags: req.body.tags || [],
                organizerId: organizerId || null, // Link to existing Organizer
                races: req.body.races ? {
                    create: await Promise.all(req.body.races.map(async race => {
                        console.log("🏁 Incoming race.competition:", race.competition);
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
                                            name: race.competition.name?.trim() || 'Individual Competition',
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
                    races: {
                        include: {
                            competition: true
                        }
                    },
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

// GET /:slug - Retrieve a specific race event by its slug, including nested races
router.get('/:slug', async (req, res) => {
    try {
        const raceEvent = await prisma.raceEvent.findUnique({
            where: {slug: req.params.slug},
            include: {
                races: {
                    include: {
                        competition: true
                    }
                },
                organizer: true
            }
        });

        if (!raceEvent) {
            return res.status(404).json({error: "Race event not found by slug"});
        }

        res.json(raceEvent);
    } catch (error) {
        console.error("❌ Error fetching race event:", error);
        res.status(500).json({error: "Failed to fetch race event", details: error.message});
    }
});

// PUT /:slug - Update an existing race event
router.put('/:slug', validateRaceEvent, async (req, res) => {
    try {
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
            where: {slug: req.params.slug},
            data: {
                eventName: req.body.eventName,
                type: req.body.type,
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
                        console.log("🏁 Incoming race.competition:", race.competition);
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

// DELETE /:slug - Delete a race event by its unique slug
router.delete('/:slug', async (req, res) => {
    try {
        await prisma.raceEvent.delete({
            where: {slug: req.params.slug},
        });
        res.json({message: "Race event deleted successfully"});
    } catch (error) {
        console.error("❌ Error deleting race event:", error);
        res.status(400).json({error: "Error deleting race event", details: error.message});
    }
});

module.exports = router;