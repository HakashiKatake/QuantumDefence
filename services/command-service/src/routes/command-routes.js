import express from 'express';
import { getPrismaClient } from '../config/prisma-client.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// GET /api/domains
router.get('/domains', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const domains = await prisma.domain.findMany({
      include: {
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    const response = domains.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      description: d.description,
      metrics: d.metrics[0] || null
    }));

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

// GET /api/domains/:id
router.get('/domains/:id', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const domain = await prisma.domain.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        units: true,
        assets: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!domain) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: 'Domain not found' });
    }

    res.status(200).json({ success: true, data: domain });
  } catch (error) {
    next(error);
  }
});

// GET /api/assets
router.get('/assets', authenticateToken(), async (req, res, next) => {
  try {
    const { domainId } = req.query;
    const prisma = getPrismaClient();
    const filter = domainId ? { domainId: parseInt(domainId) } : {};
    
    const assets = await prisma.asset.findMany({
      where: filter,
      include: {
        unit: { select: { name: true, callsign: true } },
        domain: { select: { name: true } }
      }
    });

    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets
router.post('/assets', authenticateToken(['Operator', 'Admin']), async (req, res, next) => {
  try {
    const { name, type, unitId, domainId, status, lat, lng, speed, heading, fuel, ammo } = req.body;
    if (!name || !type || !unitId || !domainId || !status || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Missing required asset fields' });
    }

    const prisma = getPrismaClient();
    const asset = await prisma.asset.create({
      data: {
        name,
        type,
        unitId: parseInt(unitId),
        domainId: parseInt(domainId),
        status,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: parseFloat(speed || 0),
        heading: parseFloat(heading || 0),
        fuel: parseFloat(fuel || 100),
        ammo: parseFloat(ammo || 100)
      }
    });

    logger.info(`Asset created: ${asset.name}`, { assetId: asset.id });
    res.status(201).json({ success: true, data: asset, message: 'Asset created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/assets/:id
router.put('/assets/:id', authenticateToken(['Operator', 'Admin']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const assetId = parseInt(req.params.id);

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: req.body
    });

    logger.info(`Asset updated: ${asset.name}`, { assetId: asset.id });
    res.status(200).json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/assets/:id
router.delete('/assets/:id', authenticateToken(['Operator', 'Admin']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const assetId = parseInt(req.params.id);

    await prisma.asset.delete({ where: { id: assetId } });

    logger.info(`Asset deleted ID: ${assetId}`);
    res.status(200).json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/units
router.get('/units', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const units = await prisma.militaryUnit.findMany({
      include: {
        assets: true,
        domain: { select: { name: true } }
      }
    });
    res.status(200).json({ success: true, data: units });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/overview
router.get('/dashboard/overview', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();

    const [domainCount, unitCount, assetCount, activeAssets] = await Promise.all([
      prisma.domain.count(),
      prisma.militaryUnit.count(),
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'Active' } })
    ]);

    // Average readiness from metrics
    const latestMetrics = await prisma.domainMetric.findMany({
      distinct: ['domainId'],
      orderBy: { timestamp: 'desc' }
    });

    const avgReadiness = latestMetrics.length > 0
      ? latestMetrics.reduce((sum, m) => sum + m.readiness, 0) / latestMetrics.length
      : 100;

    const avgThreatLevel = latestMetrics.length > 0
      ? latestMetrics.reduce((sum, m) => sum + m.threatLevel, 0) / latestMetrics.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        domains: domainCount,
        units: unitCount,
        assets: {
          total: assetCount,
          active: activeAssets
        },
        readinessIndex: parseFloat(avgReadiness.toFixed(1)),
        globalThreatLevel: parseFloat(avgThreatLevel.toFixed(1))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
