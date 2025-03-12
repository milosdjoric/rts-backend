const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Get all timing records
router.get('/', async (req, res) => {
    try {
        const timings = await prisma.timing.findMany({
            include: {
                participant: true,
                checkpoint: true,
                race: true,
            },
        });
        res.json(timings);
    } catch (error) {
        res.status(500).json({error: "Failed to fetch timing records"});
    }
});

// ✅ Record a new timing event
router.post('/', async (req, res) => {
    try {
        const {participantId, checkpointId, raceId, timestamp} = req.body;
        const timing = await prisma.timing.create({
            data: {participantId, checkpointId, raceId, timestamp: new Date(timestamp)},
        });
        res.status(201).json(timing);
    } catch (error) {
        res.status(400).json({error: "Error recording timing event"});
    }
});

module.exports = router;