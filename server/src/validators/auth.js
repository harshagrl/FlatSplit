/**
 * Zod validation schemas for auth routes
 */

const { z } = require('zod');

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform(v => v.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
  member_name: z
    .string({ required_error: 'Member name is required' })
    .min(1, 'Member name is required')
    .transform(v => v.trim()),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform(v => v.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
