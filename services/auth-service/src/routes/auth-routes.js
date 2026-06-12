import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../config/prisma-client.js';
import logger from '../config/logger.js';

const router = express.Router();

// Helper to log audit actions
async function createAuditLog(userId, action, resource, details) {
  try {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error: error.message });
  }
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'All fields are required' });
    }

    const validRoles = ['Commander', 'Operator', 'Analyst', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const prisma = getPrismaClient();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'ConflictError', message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      }
    });

    logger.info(`User registered successfully: ${user.email}`, { userId: user.id });

    // Create Audit Log
    await createAuditLog(user.id, 'REGISTER', 'User', `User registered with role: ${role}`);

    const responseUser = { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
    res.status(201).json({ success: true, data: responseUser, message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Email and password are required' });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'AuthError', message: 'Invalid email or password' });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'AuthError', message: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    logger.info(`User logged in: ${user.email}`, { userId: user.id });

    await createAuditLog(user.id, 'LOGIN', 'Session', 'User logged in successfully');

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      },
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/verify (Internal validation)
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'AuthError', message: 'Authorization header token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'AuthError', message: 'Token is invalid or expired' });
    }
    res.status(200).json({ success: true, data: user });
  });
});

export default router;
