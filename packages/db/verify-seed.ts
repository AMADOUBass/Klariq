import 'dotenv/config';
import { prisma } from './src';

async function main() {
  console.log('--- Database Verification ---');
  
  const user = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
    include: {
      accounts: true,
      members: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!user) {
    console.log('❌ User test@example.com NOT found!');
  } else {
    console.log('✅ User found:', user.email);
    console.log('✅ Accounts:', user.accounts.map(a => ({ provider: a.providerId, accountId: a.accountId })));
    console.log('✅ Memberships:', user.members.map(m => m.organization.name));
  }

  const companies = await prisma.company.findMany();
  console.log('✅ Companies in DB:', companies.map(c => c.name));

  await prisma.$disconnect();
}

main();
