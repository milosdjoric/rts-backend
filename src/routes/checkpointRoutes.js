const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Get all checkpoints
router.get('/', async (req, res) => {
    try {
        const checkpoints = await prisma.checkpoint.findMany();
        res.json(checkpoints);
    } catch (error) {
        res.status(500).json({error: "Failed to fetch checkpoints"});
    }
});

// ✅ Create a new checkpoint
router.post('/', async (req, res) => {
    try {
        const {name, location} = req.body;
        const checkpoint = await prisma.checkpoint.create({
            data: {name, location},
        });
        res.status(201).json(checkpoint);
    } catch (error) {
        res.status(400).json({error: "Error creating checkpoint"});
    }
});

module.exports = router;