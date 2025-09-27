import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

const users = [
  { email: 'testuser1@example.com', username: 'testuser1', password: 'password123', fullName: 'Test User One', role: 'user' },
  { email: 'testadmin@example.com', username: 'admin', password: 'AdminPass123!', fullName: 'Administrator', role: 'admin' }
];

async function main() {
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) continue;
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { email: u.email, username: u.username, password: hashed, fullName: u.fullName, role: u.role } });
    console.log(`Seeded user ${u.email}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
