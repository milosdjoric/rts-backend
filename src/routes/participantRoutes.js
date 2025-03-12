const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all participants
router.get('/', async (req, res) => {
    try {
        const participants = await prisma.participant.findMany();
        res.json(participants);
    } catch (error) {
        res.status(500).json({error: "Failed to fetch participants"});
    }
});

// Add a new participant
router.post('/', async (req, res) => {
    try {
        const {name, rfidTag} = req.body;
        const participant = await prisma.participant.create({
            data: {name, rfidTag}
        });
        res.status(201).json(participant);
    } catch (error) {
        res.status(400).json({error: "Error creating participant"});
    }
});

module.exports = router;