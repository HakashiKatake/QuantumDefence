import express from 'express';
import cors from 'cors';
import client from 'prom-client';
import logger from './config/logger.js';
import commandRoutes from './routes/command-routes.js';
import { getPrismaClient } from './config/prisma-client.js';

const app = express();

app.use(cors());
app.use(express.json());

// Prometheus Registry setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsCounter = new client.Counter({
  name: 'command_service_http_requests_total',
  help: 'Total number of HTTP requests on Command Service',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestsCounter);

// Middleware to count metrics
app.use((req, res, next) => {
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    httpRequestsCounter.inc({ method: req.method, route, status: res.statusCode });
  });
  next();
});

// Health check endpoint
app.get('/api/domains/health', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: 'UP', database: 'UP' });
  } catch (error) {
    res.status(500).json({ success: false, status: 'DOWN', database: 'DOWN', error: error.message });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// API Routes
app.use('/api', commandRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled request error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  });
});

export default app;
