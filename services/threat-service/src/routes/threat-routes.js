import express from 'express';
import { getPrismaClient } from '../config/prisma-client.js';
import { authenticateToken } from '../middleware/auth.js';
import { broadcastEvent } from '../websocket/socket.js';
import logger from '../config/logger.js';

const router = express.Router();

// GET /api/threats
router.get('/threats', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const threats = await prisma.threat.findMany({
      orderBy: { detectedAt: 'desc' }
    });
    res.status(200).json({ success: true, data: threats });
  } catch (error) {
    next(error);
  }
});

// POST /api/threats
router.post('/threats', authenticateToken(['Analyst', 'Admin']), async (req, res, next) => {
  try {
    const { name, type, severity, domainId, status, lat, lng, description } = req.body;
    if (!name || !type || !severity || !domainId || !status || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Missing threat fields' });
    }

    const prisma = getPrismaClient();
    const threat = await prisma.threat.create({
      data: {
        name,
        type,
        severity,
        domainId: parseInt(domainId),
        status,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        description: description || ''
      }
    });

    logger.info(`Threat registered: ${threat.name} [${threat.severity}]`, { threatId: threat.id });

    // Broadcast WebSocket event
    broadcastEvent('threat:detected', threat);

    // Auto-create alert for high/critical threats
    if (['High', 'Critical'].includes(severity)) {
      const alert = await prisma.alert.create({
        data: {
          type: 'ThreatDetection',
          severity,
          message: `ALERT: Active ${severity} threat detected: ${name} (${type}) in domain ID ${domainId}`,
          domainId: parseInt(domainId)
        }
      });
      logger.info(`Auto-alert created for threat ID: ${threat.id}`, { alertId: alert.id });
      broadcastEvent('alert:new', alert);
    }

    res.status(201).json({ success: true, data: threat, message: 'Threat registered successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/threats/:id
router.put('/threats/:id', authenticateToken(['Analyst', 'Admin']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const threatId = parseInt(req.params.id);

    const threat = await prisma.threat.update({
      where: { id: threatId },
      data: req.body
    });

    logger.info(`Threat updated: ${threat.name}`, { threatId: threat.id });
    res.status(200).json({ success: true, data: threat, message: 'Threat updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/threats/:id/neutralize
router.put('/threats/:id/neutralize', authenticateToken(['Analyst', 'Admin', 'Commander']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const threatId = parseInt(req.params.id);

    const threat = await prisma.threat.update({
      where: { id: threatId },
      data: { status: 'Neutralized' }
    });

    logger.info(`Threat neutralized: ${threat.name}`, { threatId: threat.id });
    
    // Create status change alert
    const alert = await prisma.alert.create({
      data: {
        type: 'ThreatNeutralized',
        severity: 'Low',
        message: `INFO: Threat neutralized: ${threat.name}`,
        domainId: threat.domainId
      }
    });
    broadcastEvent('alert:new', alert);

    res.status(200).json({ success: true, data: threat, message: 'Threat neutralized successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts
router.get('/alerts', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts
router.post('/alerts', authenticateToken(['Analyst', 'Admin']), async (req, res, next) => {
  try {
    const { type, severity, message, domainId } = req.body;
    if (!type || !severity || !message || !domainId) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Missing alert fields' });
    }

    const prisma = getPrismaClient();
    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        message,
        domainId: parseInt(domainId)
      }
    });

    logger.info(`Alert triggered: ${alert.message}`, { alertId: alert.id });
    broadcastEvent('alert:new', alert);

    res.status(201).json({ success: true, data: alert, message: 'Alert created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/alerts/:id/acknowledge
router.put('/alerts/:id/acknowledge', authenticateToken(['Analyst', 'Admin', 'Operator', 'Commander']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const alertId = parseInt(req.params.id);

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: { acknowledged: true }
    });

    logger.info(`Alert acknowledged: ${alertId} by ${req.user.name}`);
    res.status(200).json({ success: true, data: alert, message: 'Alert acknowledged' });
  } catch (error) {
    next(error);
  }
});

export default router;
