import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { hash } from '@node-rs/argon2';
import { 
  prisma,
  AccountType, 
  JournalEntryType, 
  EntryLineType, 
  PeriodStatus 
} from './src';

async function main() {
  console.log('🚀 Seeding rich test data for Klariq...');

  const userId = 'user-test-id-123';
  const orgId = 'org-test-id-123';
  const sessionId = 'session-test-id-123';
  const sessionToken = 'test-session-token-123';
  const hashedPassword = await hash('password123');

  // Cleanup existing data to avoid unique constraints
  console.log('🧹 Cleaning up old test data...');
  await prisma.journalLine.deleteMany({ where: { journalEntry: { companyId: orgId } } });
  await prisma.journalEntry.deleteMany({ where: { companyId: orgId } });
  await prisma.account.deleteMany({ where: { companyId: orgId } });
  await prisma.fiscalPeriod.deleteMany({ where: { companyId: orgId } });
  await prisma.company.deleteMany({ where: { id: orgId } });
  await prisma.member.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.deleteMany({ where: { OR: [{ id: orgId }, { slug: 'klariq-demo' }] } });
  await prisma.session.deleteMany({ where: { userId: userId } });
  await prisma.accountAuth.deleteMany({ where: { userId: userId } });
  await prisma.user.deleteMany({ where: { OR: [{ id: userId }, { email: 'test@example.com' }] } });

  // 1. Create User
  console.log('👤 Creating Test User...');
  const user = await prisma.user.create({
    data: {
      id: userId,
      name: 'Test Admin',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 2. Create Password
  console.log('🔑 Setting up credentials...');
  await prisma.accountAuth.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      accountId: user.email,
      providerId: 'email-password',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 3. Create Organization
  console.log('🏢 Creating Organization...');
  const org = await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: 'Klariq Demo Inc.',
      slug: 'klariq-demo',
      createdAt: new Date(),
    },
  });

  // 4. Create Member
  await prisma.member.create({
    data: {
      id: uuidv4(),
      organizationId: org.id,
      userId: user.id,
      role: 'admin',
      createdAt: new Date(),
    },
  });

  // 5. Create Company (Financial Entity)
  console.log('🏛️  Initializing Company profile...');
  await prisma.company.deleteMany({ where: { id: org.id } });
  const company = await prisma.company.create({
    data: {
      id: org.id,
      externalId: org.id,
      name: org.name,
      legalName: 'Klariq Technologies Demo Service',
      address: '456 Rue des Finances, Québec, QC G1R 4P3',
      phone: '+1 (418) 555-0123',
      taxNumberGst: '123456789 RT 0001',
      taxNumberQst: '1234567890 TQ 0001',
    },
  });

  // 6. Create Active Session
  await prisma.session.create({
    data: {
      id: sessionId,
      token: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      activeOrganizationId: org.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 7. Create Fiscal Period
  console.log('📅 Opening Fiscal Period (2024)...');
  const period = await prisma.fiscalPeriod.create({
    data: {
      id: uuidv4(),
      companyId: company.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: PeriodStatus.OPEN,
    },
  });

  // 8. Create Chart of Accounts
  console.log('📚 Creating Chart of Accounts...');
  const accounts = [
    { code: '1000', name: 'ACTIF', type: AccountType.ASSET },
    { code: '1010', name: 'Banque (Opérations)', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1200', name: 'Comptes clients', type: AccountType.ASSET, parentCode: '1000' },
    { code: '2000', name: 'PASSIF', type: AccountType.LIABILITY },
    { code: '2100', name: 'Comptes fournisseurs', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '2310', name: 'TPS à payer', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '2320', name: 'TVQ à payer', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '3000', name: 'CAPITAUX PROPRES', type: AccountType.EQUITY },
    { code: '3100', name: 'Capital Actions', type: AccountType.EQUITY, parentCode: '3000' },
    { code: '4000', name: 'REVENUS', type: AccountType.REVENUE },
    { code: '4100', name: 'Ventes de services', type: AccountType.REVENUE, parentCode: '4000' },
    { code: '5000', name: 'DÉPENSES', type: AccountType.EXPENSE },
    { code: '5100', name: 'Loyer et charges', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5200', name: 'Fournitures de bureau', type: AccountType.EXPENSE, parentCode: '5000' },
  ];

  const accountMap = new Map();
  for (const acc of accounts) {
    const parent = acc.parentCode ? accountMap.get(acc.parentCode) : null;
    const created = await prisma.account.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        parentId: parent?.id,
        isSystem: true,
      }
    });
    accountMap.set(acc.code, created);
  }

  // 9. Create Initial Transactions
  console.log('💸 Recording Transactions...');
  
  // Transaction A: Initial Investment ($10,000)
  const entryA = await prisma.journalEntry.create({
    data: {
      id: uuidv4(),
      companyId: company.id,
      periodId: period.id,
      date: new Date('2024-01-05'),
      description: 'Apport de capital initial',
      type: JournalEntryType.MANUAL,
      isPosted: true,
      createdBy: user.id,
      lines: {
        create: [
          {
            id: uuidv4(),
            accountId: accountMap.get('1010').id,
            type: EntryLineType.DEBIT,
            amount: 10000.00,
            amountCad: 10000.00,
            exchangeRate: 1.0,
            currency: 'CAD',
            description: 'Dépôt initial'
          },
          {
            id: uuidv4(),
            accountId: accountMap.get('3100').id,
            type: EntryLineType.CREDIT,
            amount: 10000.00,
            amountCad: 10000.00,
            exchangeRate: 1.0,
            currency: 'CAD',
            description: 'Émission d\'actions'
          }
        ]
      }
    }
  });

  // Transaction B: A Sale ($2,500 + Taxes)
  const entryB = await prisma.journalEntry.create({
    data: {
      id: uuidv4(),
      companyId: company.id,
      periodId: period.id,
      date: new Date('2024-02-10'),
      description: 'Facture #INV-2024-001 - Client ABC',
      type: JournalEntryType.INVOICE,
      isPosted: true,
      createdBy: user.id,
      lines: {
        create: [
          {
            id: uuidv4(),
            accountId: accountMap.get('1200').id,
            type: EntryLineType.DEBIT,
            amount: 2874.38,
            amountCad: 2874.38,
            exchangeRate: 1.0,
            currency: 'CAD',
          },
          {
            id: uuidv4(),
            accountId: accountMap.get('4100').id,
            type: EntryLineType.CREDIT,
            amount: 2500.00,
            amountCad: 2500.00,
            exchangeRate: 1.0,
            currency: 'CAD',
          },
          {
            id: uuidv4(),
            accountId: accountMap.get('2310').id,
            type: EntryLineType.CREDIT,
            amount: 125.00,
            amountCad: 125.00,
            exchangeRate: 1.0,
            currency: 'CAD',
          },
          {
            id: uuidv4(),
            accountId: accountMap.get('2320').id,
            type: EntryLineType.CREDIT,
            amount: 249.38,
            amountCad: 249.38,
            exchangeRate: 1.0,
            currency: 'CAD',
          }
        ]
      }
    }
  });

  // Transaction C: Rent Expense ($1,200)
  await prisma.journalEntry.create({
    data: {
      id: uuidv4(),
      companyId: company.id,
      periodId: period.id,
      date: new Date('2024-03-01'),
      description: 'Loyer Mars 2024',
      type: JournalEntryType.MANUAL,
      isPosted: true,
      createdBy: user.id,
      lines: {
        create: [
          {
            id: uuidv4(),
            accountId: accountMap.get('5100').id,
            type: EntryLineType.DEBIT,
            amount: 1200.00,
            amountCad: 1200.00,
            exchangeRate: 1.0,
            currency: 'CAD',
          },
          {
            id: uuidv4(),
            accountId: accountMap.get('1010').id,
            type: EntryLineType.CREDIT,
            amount: 1200.00,
            amountCad: 1200.00,
            exchangeRate: 1.0,
            currency: 'CAD',
          }
        ]
      }
    }
  });

  console.log('✅ Rich test data seeded successfully!');
  console.log('User: test@example.com / password123');
  console.log('Session Token: test-session-token-123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
