require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const participantRoutes = require('./routes/participantRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const raceRoutes = require('./routes/raceEventsRoutes');
const timingRoutes = require('./routes/timingRoutes');

const app = express();
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// ✅ Register routes
app.use('/api/participants', participantRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/timings', timingRoutes);

app.get('/', (req, res) => {
    res.send('Race Timing System Backend Running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});