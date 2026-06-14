require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.findMany({ include: { member: true } });
  console.log('USERS:', users.map(u => u.member.name));
  
  const available = await prisma.member.findMany({
    where: { user: null, is_active: true }
  });
  console.log('AVAILABLE:', available.map(m => m.name));
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
