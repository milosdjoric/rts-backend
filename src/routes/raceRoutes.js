const express = require('express');
const {PrismaClient} = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Get all races
router.get('/', async (req, res) => {
    try {
        const races = await prisma.race.findMany();
        res.json(races);
    } catch (error) {
        res.status(500).json({error: "Failed to fetch races"});
    }
});

// ✅ Create a new race
router.post('/', async (req, res) => {
    try {
        const {name, date} = req.body;
        const race = await prisma.race.create({
            data: {name, date: new Date(date)},
        });
        res.status(201).json(race);
    } catch (error) {
        res.status(400).json({error: "Error creating race"});
    }
});

module.exports = router;