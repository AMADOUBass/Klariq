import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('DB URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient({});

async function main() {
  console.log('Connecting...');
  const count = await prisma.user.count();
  console.log('User count:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
