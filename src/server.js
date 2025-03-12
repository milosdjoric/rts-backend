require('dotenv').config();
const express = require('express');
const cors = require('cors');

const participantRoutes = require('./routes/participantRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Use the participant routes
app.use('/api/participants', participantRoutes);

app.get('/', (req, res) => {
    res.send('Race Timing System Backend Running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});