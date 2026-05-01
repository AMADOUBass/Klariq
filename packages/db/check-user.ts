import 'dotenv/config';
import { prisma } from './src';

async function main() {
  const email = 'ton-email@exemple.com';
  const user = await prisma.user.findUnique({
    where: { email },
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
    console.log(`❌ User ${email} not found.`);
  } else {
    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`Organizations:`, user.members.map(m => m.organization.name));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
