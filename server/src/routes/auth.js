/**
 * Auth routes — Register and Login
 * 
 * POST /api/auth/register — Create a new user account linked to an existing member
 * POST /api/auth/login    — Authenticate and return JWT
 * GET  /api/auth/me       — Return current user (requires auth)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { registerSchema, loginSchema } = require('../validators/auth');
const { AppError } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const JWT_EXPIRY = '7d';
const BCRYPT_ROUNDS = 10;

/**
 * Generate JWT token with standard payload shape
 */
function generateToken(user, member) {
  return jwt.sign(
    {
      userId: user.id,
      memberId: member.id,
      memberName: member.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Format user object for API responses
 */
function formatUserResponse(user, member) {
  return {
    id: user.id,
    email: user.email,
    member_id: member.id,
    member_name: member.name,
    created_at: user.created_at,
  };
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    // Validate input
    const data = registerSchema.parse(req.body);

    // Find member by name (case-insensitive)
    const member = await prisma.member.findFirst({
      where: {
        name: { equals: data.member_name, mode: 'insensitive' },
      },
      include: { user: true },
    });

    if (!member) {
      throw AppError(404, 'MEMBER_NOT_FOUND', 'Member not found. Contact your admin.');
    }

    // Check if member already has an account
    if (member.user) {
      throw AppError(409, 'ACCOUNT_EXISTS', 'An account already exists for this member.');
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        member_id: member.id,
      },
    });

    // Generate token
    const token = generateToken(user, member);

    res.status(201).json({
      token,
      user: formatUserResponse(user, member),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    // Validate input
    const data = loginSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { member: true },
    });

    if (!user) {
      throw AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Compare password
    const validPassword = await bcrypt.compare(data.password, user.password_hash);

    if (!validPassword) {
      throw AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Generate token
    const token = generateToken(user, user.member);

    res.json({
      token,
      user: formatUserResponse(user, user.member),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me — Get current authenticated user
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { member: true },
    });

    if (!user) {
      throw AppError(404, 'USER_NOT_FOUND', 'User account not found.');
    }

    res.json({
      user: formatUserResponse(user, user.member),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
