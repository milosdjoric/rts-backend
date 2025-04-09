require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./middleware/passport');

const PORT = process.env.PORT || 5001;

const participantRoutes = require('./routes/participantRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const raceRoutes = require('./routes/raceEventsRoutes');
const timingRoutes = require('./routes/timingRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json());

const session = require('express-session');
const passport = require('passport');

app.use(session({
    secret: 'your-secret-key', // replace with a secure key in production
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ Register routes
app.use('/api/participants', participantRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/timings', timingRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({message: 'Race Timing System Backend Running'});
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});