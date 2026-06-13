/**
 * Centralized Prisma client instance for FlatSplit
 * 
 * Prisma v7 requires a driver adapter for PostgreSQL.
 * Uses @prisma/adapter-pg with the `pg` Pool.
 * 
 * Import this module anywhere you need database access:
 *   const { prisma } = require('../lib/prisma');
 */

const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };
