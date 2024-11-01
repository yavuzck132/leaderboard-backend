import express from 'express';
import dbClient from './clients/dbClient';
import redisClient from './clients/redisClient';
import { prefillData } from './services/prefillData';
import apiRoutes from './apis/api';
import "./services/weeklyUpdateService";
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

let server;
//Define SSL options for HTTPS server
if (process.env.NODE_ENV === 'production') {
  // Render manages HTTPS in production, so just start the app directly
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} else {
  // Local HTTPS server for development, if needed
  const options = {
    key: fs.readFileSync(path.join(__dirname, process.env.SSL_PRIVATE_KEY || '')),
    cert: fs.readFileSync(path.join(__dirname, process.env.SSL_CERTIFICATE || '')),
  };

  server = https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS Server running on https://localhost:${PORT}`);
  });
}

// Prefill data in development mode
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  prefillData()
    .then(() => console.log('Prefill complete'))
    .catch((error) => console.error('Error in prefill:', error));
}

// Main route
app.get('/', (req, res) => {
  res.send('Server is up and running');
});

// Middleware
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3001',
  methods: ['GET'],
  credentials: true
}));

// Use API routes
app.use('/api', apiRoutes);

// Graceful shutdown for both Redis and PostgreSQL
process.on('SIGINT', async () => {
  console.log('Closing connections...');
  try {
    await dbClient.end();
    await redisClient.quit();
    console.log('Connections closed successfully.');
  } catch (error) {
    console.error('Error closing connections:', error);
  } finally {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  }
});
