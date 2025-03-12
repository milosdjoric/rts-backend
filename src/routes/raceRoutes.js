const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Get all races
router.get('/', async (req, res) => {
    try {
        const races = await prisma.race.findMany();
        res.json(races);
    } catch (error) {
        console.error("❌ Error fetching races:", error);
        res.status(500).json({ error: "Failed to fetch races", details: error.message });
    }
});

// ✅ Create a new race
router.post('/', async (req, res) => {
    try {
        console.log("📩 Incoming Race Data:", req.body);

        // Validate required fields
        const requiredFields = ["eventName", "organizer", "contactPhone", "contactEmail", "startLocation", "date", "distance"];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        // Format the date correctly
        const formattedDate = new Date(req.body.date).toISOString();

        const race = await prisma.race.create({
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
                date: formattedDate,
                elevation: req.body.elevation ? Number(req.body.elevation) : null,
                distance: req.body.distance,
                competition: req.body.competition || null,
            },
        });

        res.status(201).json(race);
    } catch (error) {
        console.error("❌ Error creating race:", error);
        res.status(400).json({ error: "Error creating race", details: error.message });
    }
});

// ✅ Get a single race by ID
router.get('/:id', async (req, res) => {
    try {
        const race = await prisma.race.findUnique({
            where: { id: req.params.id },
        });

        if (!race) {
            return res.status(404).json({ error: "Race not found" });
        }

        res.json(race);
    } catch (error) {
        console.error("❌ Error fetching race:", error);
        res.status(500).json({ error: "Failed to fetch race", details: error.message });
    }
});

// ✅ Update an existing race
router.put('/:id', async (req, res) => {
    try {
        console.log("✏️ Updating Race Data:", req.body);

        // Format date if provided
        const formattedDate = req.body.date ? new Date(req.body.date).toISOString() : undefined;

        const updatedRace = await prisma.race.update({
            where: { id: req.params.id },
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
                date: formattedDate,
                elevation: req.body.elevation ? Number(req.body.elevation) : null,
                distance: req.body.distance,
                competition: req.body.competition || null,
            },
        });

        res.json(updatedRace);
    } catch (error) {
        console.error("❌ Error updating race:", error);
        res.status(400).json({ error: "Error updating race", details: error.message });
    }
});

// ✅ Delete a race
router.delete('/:id', async (req, res) => {
    try {
        await prisma.race.delete({
            where: { id: req.params.id },
        });
        res.json({ message: "Race deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting race:", error);
        res.status(400).json({ error: "Error deleting race", details: error.message });
    }
});

module.exports = router;