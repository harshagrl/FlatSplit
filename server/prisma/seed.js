/**
 * Seed script — Creates the 6 member records for FlatSplit
 * 
 * Run with: npm run seed
 * 
 * Members:
 * - Aisha, Rohan, Priya: Active flatmates since Feb 1, 2026
 * - Meera: Departed flatmate (Feb 1 – Mar 31, 2026)
 * - Dev: Guest, appeared in trip expenses (Feb 8 – Mar 14, 2026)
 * - Sam: Joined April 8, 2026
 */

require('dotenv').config();

const { PrismaClient } = require('../src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Set up Prisma with pg adapter (Prisma v7 requirement)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const members = [
  {
    name: 'Aisha',
    joined_at: new Date('2026-02-01'),
    left_at: null,
    is_active: true,
    notes: null,
  },
  {
    name: 'Rohan',
    joined_at: new Date('2026-02-01'),
    left_at: null,
    is_active: true,
    notes: null,
  },
  {
    name: 'Priya',
    joined_at: new Date('2026-02-01'),
    left_at: null,
    is_active: true,
    notes: null,
  },
  {
    name: 'Meera',
    joined_at: new Date('2026-02-01'),
    left_at: new Date('2026-03-31'),
    is_active: false,
    notes: 'Departed flatmate — left end of March 2026',
  },
  {
    name: 'Dev',
    joined_at: new Date('2026-02-08'),
    left_at: new Date('2026-03-14'),
    is_active: false,
    notes: 'Guest — visited for weekend trip expenses only',
  },
  {
    name: 'Sam',
    joined_at: new Date('2026-04-08'),
    left_at: null,
    is_active: true,
    notes: null,
  },
];

async function main() {
  console.log('🌱 Seeding members...\n');

  for (const member of members) {
    const result = await prisma.member.upsert({
      where: { name: member.name },
      update: {
        joined_at: member.joined_at,
        left_at: member.left_at,
        is_active: member.is_active,
        notes: member.notes,
      },
      create: member,
    });

    const status = member.is_active
      ? '✅ Active  '
      : member.notes?.includes('Guest')
        ? '👤 Guest   '
        : '📦 Departed';
    const dateRange = member.left_at
      ? `${member.joined_at.toISOString().split('T')[0]} → ${member.left_at.toISOString().split('T')[0]}`
      : `${member.joined_at.toISOString().split('T')[0]} → present`;

    console.log(`  ${status}  ${result.name.padEnd(8)} ${dateRange}`);
  }

  console.log(`\n✅ Seeded ${members.length} members successfully.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
