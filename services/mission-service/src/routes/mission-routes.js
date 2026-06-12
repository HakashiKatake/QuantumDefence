import express from 'express';
import { getPrismaClient } from '../config/prisma-client.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// GET /api/missions
router.get('/missions', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const missions = await prisma.mission.findMany({
      include: { units: true },
      orderBy: { startDate: 'desc' }
    });
    res.status(200).json({ success: true, data: missions });
  } catch (error) {
    next(error);
  }
});

// GET /api/missions/:id
router.get('/missions/:id', authenticateToken(), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const mission = await prisma.mission.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { units: true }
    });

    if (!mission) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: 'Mission not found' });
    }

    res.status(200).json({ success: true, data: mission });
  } catch (error) {
    next(error);
  }
});

// POST /api/missions
router.post('/missions', authenticateToken(['Commander', 'Admin']), async (req, res, next) => {
  try {
    const { name, domainId, status, priority, objective, units } = req.body;
    if (!name || !domainId || !status || !priority || !objective) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Missing mission fields' });
    }

    const prisma = getPrismaClient();
    const mission = await prisma.mission.create({
      data: {
        name,
        domainId: parseInt(domainId),
        status,
        priority,
        objective,
        units: {
          create: (units || []).map(u => ({
            unitId: parseInt(u.unitId),
            role: u.role || 'Support'
          }))
        }
      },
      include: { units: true }
    });

    logger.info(`Mission created: ${mission.name}`, { missionId: mission.id });
    res.status(201).json({ success: true, data: mission, message: 'Mission created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/missions/:id
router.put('/missions/:id', authenticateToken(['Commander', 'Admin']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const missionId = parseInt(req.params.id);

    const { name, domainId, priority, objective, units } = req.body;

    const data = {};
    if (name) data.name = name;
    if (domainId) data.domainId = parseInt(domainId);
    if (priority) data.priority = priority;
    if (objective) data.objective = objective;

    // Handle units update if provided
    if (units) {
      // Delete existing unit assignments
      await prisma.missionUnit.deleteMany({ where: { missionId } });
      // Create new unit assignments
      data.units = {
        create: units.map(u => ({
          unitId: parseInt(u.unitId),
          role: u.role || 'Support'
        }))
      };
    }

    const mission = await prisma.mission.update({
      where: { id: missionId },
      data,
      include: { units: true }
    });

    logger.info(`Mission updated: ${mission.name}`, { missionId: mission.id });
    res.status(200).json({ success: true, data: mission, message: 'Mission updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/missions/:id/status
router.put('/missions/:id/status', authenticateToken(['Commander', 'Admin']), async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const missionId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Status is required' });
    }

    const validStates = ['Planning', 'Active', 'Completed', 'Failed'];
    if (!validStates.includes(status)) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: `Status must be one of: ${validStates.join(', ')}` });
    }

    const existingMission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!existingMission) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: 'Mission not found' });
    }

    // State machine check
    const current = existingMission.status;
    let validTransition = false;

    if (current === 'Planning' && ['Active', 'Completed', 'Failed'].includes(status)) validTransition = true;
    if (current === 'Active' && ['Completed', 'Failed'].includes(status)) validTransition = true;
    if (current === status) validTransition = true; // no-op

    if (!validTransition) {
      return res.status(400).json({
        success: false,
        error: 'StateTransitionError',
        message: `Cannot transition mission status from '${current}' to '${status}'`
      });
    }

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        status,
        endDate: ['Completed', 'Failed'].includes(status) ? new Date() : null
      }
    });

    logger.info(`Mission status updated: ${updatedMission.name} to ${status}`, { missionId });
    res.status(200).json({ success: true, data: updatedMission, message: `Status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

export default router;
