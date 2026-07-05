require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDb } = require('./db');
const { router: authRouter } = require('./routes/auth');
const trackerRouter = require('./routes/tracker');
const { startSimulation } = require('./services/tracker');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // For development, allow requests from any host. We can restrict this if needed.
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Routes Setup
app.use('/api/auth', authRouter);
app.use('/api/tracker', trackerRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    dbFallbackMode: require('./db').isFallbackMode()
  });
});

// Boot Server and database
async function startServer() {
  // Connect to DB (or local fallback)
  await connectDb();

  // Start background monitoring/simulation engine
  const simInterval = parseInt(process.env.SIMULATION_INTERVAL_SEC || 30, 10);
  startSimulation(simInterval);

  // Bind server port
  app.listen(PORT, () => {
    console.log(`🚀 Social Media Tracker API server running on port ${PORT}`);
  });
}

startServer();
