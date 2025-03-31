const express = require('express');
const {PrismaClient} = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET / - Retrieve all competitions
router.get('/', async (req, res) => {
    try {
        const competitions = await prisma.competition.findMany();
        res.json(competitions);
    } catch (error) {
        console.error("❌ Error fetching competitions:", error);
        res.status(500).json({error: "Failed to fetch competitions", details: error.message});
    }
});

module.exports = router;