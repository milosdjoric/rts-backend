require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 5001;

const participantRoutes = require('./routes/participantRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const raceRoutes = require('./routes/raceEventsRoutes');
const timingRoutes = require('./routes/timingRoutes');
const competitionRoutes = require('./routes/competitionRoutes');

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json());

// ✅ Register routes
app.use('/api/participants', participantRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/timings', timingRoutes);
app.use('/api/competitions', competitionRoutes);

app.get('/', (req, res) => {
    res.send('Race Timing System Backend Running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});