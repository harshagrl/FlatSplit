require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  await prisma.user.deleteMany();
  
  const password_hash = await bcrypt.hash('password123', 10);
  const accounts = [
    { name: 'Aisha', email: 'aisha@test.com' },
    { name: 'Rohan', email: 'rohan@test.com' },
    { name: 'Priya', email: 'priya@test.com' },
    { name: 'Sam', email: 'sam@test.com' },
  ];

  for (const acc of accounts) {
    const member = await prisma.member.findUnique({ where: { name: acc.name } });
    if (member) {
      await prisma.user.upsert({
        where: { email: acc.email },
        update: {},
        create: {
          email: acc.email,
          password_hash,
          member_id: member.id,
        }
      });
      console.log(`Created user for ${acc.name}`);
    }
  }
}

seedUsers().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
