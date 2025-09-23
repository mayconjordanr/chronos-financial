// Prisma seed script for CHRONOS multi-tenant financial SaaS
// This script creates initial data for development and testing

import { PrismaClient, TenantStatus, TenantPlan, UserRole, UserStatus, AccountType, TransactionType, TransactionStatus, BudgetPeriod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      id: 'demo-tenant-id',
      name: 'Demo Company',
      slug: 'demo-company',
      domain: 'demo.chronos.local',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.PREMIUM,
      settings: {
        features: {
          whatsappIntegration: true,
          budgetAlerts: true,
          auditLogging: true,
          exportData: true
        },
        branding: {
          logo: '/assets/demo-logo.png',
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af'
        },
        security: {
          requireTwoFactor: false,
          sessionTimeout: 86400000,
          passwordPolicy: {
            minLength: 8,
            requireNumbers: true,
            requireSymbols: true,
            requireUppercase: true
          }
        }
      },
      timezone: 'America/New_York',
      currency: 'USD',
      locale: 'en'
    }
  });

  console.log(`✅ Created tenant: ${defaultTenant.name}`);

  // Create admin user
  const hashedAdminPassword = await bcrypt.hash('admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: defaultTenant.id,
        email: 'admin@demo.local'
      }
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: 'admin@demo.local',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedAdminPassword,
      phone: '+1234567890',
      role: UserRole.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create regular users
  const users = [
    {
      email: 'john.doe@demo.local',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567891',
      role: UserRole.USER
    },
    {
      email: 'jane.smith@demo.local',
      username: 'janesmith',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567892',
      role: UserRole.USER
    }
  ];

  const hashedUserPassword = await bcrypt.hash('user123!', 10);
  const createdUsers = [];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: defaultTenant.id,
          email: userData.email
        }
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        ...userData,
        password: hashedUserPassword,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    });
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.email}`);
  }

  // Create default categories
  const categories = [
    { name: 'Food & Dining', description: 'Restaurants, groceries, and food delivery', color: '#f59e0b', icon: '🍽️' },
    { name: 'Transportation', description: 'Gas, public transport, rideshare', color: '#3b82f6', icon: '🚗' },
    { name: 'Shopping', description: 'Clothing, electronics, general shopping', color: '#ec4899', icon: '🛍️' },
    { name: 'Entertainment', description: 'Movies, games, subscriptions', color: '#8b5cf6', icon: '🎬' },
    { name: 'Bills & Utilities', description: 'Rent, electricity, internet, phone', color: '#ef4444', icon: '🏠' },
    { name: 'Healthcare', description: 'Medical expenses, pharmacy, insurance', color: '#10b981', icon: '🏥' },
    { name: 'Education', description: 'Books, courses, school fees', color: '#f97316', icon: '📚' },
    { name: 'Travel', description: 'Flights, hotels, vacation expenses', color: '#06b6d4', icon: '✈️' },
    { name: 'Income', description: 'Salary, freelance, investment returns', color: '#22c55e', icon: '💰' },
    { name: 'Savings', description: 'Emergency fund, retirement, investments', color: '#84cc16', icon: '💎' }
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: {
        tenantId_name: {
          tenantId: defaultTenant.id,
          name: categoryData.name
        }
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        ...categoryData,
        isSystem: true,
        isActive: true
      }
    });
    createdCategories.push(category);
    console.log(`✅ Created category: ${category.name}`);
  }

  // Create accounts for users
  const accountTypes = [
    { type: AccountType.CHECKING, name: 'Main Checking', balance: 5000.00, bankName: 'Demo Bank' },
    { type: AccountType.SAVINGS, name: 'Emergency Fund', balance: 15000.00, bankName: 'Demo Bank' },
    { type: AccountType.CREDIT_CARD, name: 'Rewards Credit Card', balance: -2500.00, bankName: 'Demo Credit Union' },
    { type: AccountType.INVESTMENT, name: 'Investment Portfolio', balance: 25000.00, bankName: 'Demo Investments' }
  ];

  const allAccounts = [];
  for (const user of [adminUser, ...createdUsers]) {
    for (const accountData of accountTypes) {
      const account = await prisma.account.create({
        data: {
          tenantId: defaultTenant.id,
          userId: user.id,
          name: `${user.firstName}'s ${accountData.name}`,
          type: accountData.type,
          balance: accountData.balance,
          currency: 'USD',
          description: `${accountData.name} for ${user.firstName} ${user.lastName}`,
          bankName: accountData.bankName,
          accountNumber: `****${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          isActive: true
        }
      });
      allAccounts.push(account);
      console.log(`✅ Created account: ${account.name} for ${user.firstName}`);
    }
  }

  // Create sample transactions
  const transactionTemplates = [
    { description: 'Grocery Store Purchase', amount: -125.50, type: TransactionType.EXPENSE, categoryName: 'Food & Dining' },
    { description: 'Gas Station Fill-up', amount: -65.00, type: TransactionType.EXPENSE, categoryName: 'Transportation' },
    { description: 'Monthly Salary', amount: 5000.00, type: TransactionType.INCOME, categoryName: 'Income' },
    { description: 'Coffee Shop', amount: -12.50, type: TransactionType.EXPENSE, categoryName: 'Food & Dining' },
    { description: 'Netflix Subscription', amount: -15.99, type: TransactionType.EXPENSE, categoryName: 'Entertainment' },
    { description: 'Electricity Bill', amount: -120.00, type: TransactionType.EXPENSE, categoryName: 'Bills & Utilities' },
    { description: 'Online Shopping', amount: -89.99, type: TransactionType.EXPENSE, categoryName: 'Shopping' },
    { description: 'Emergency Fund Transfer', amount: -500.00, type: TransactionType.TRANSFER, categoryName: 'Savings' }
  ];

  const createdTransactions = [];
  for (const account of allAccounts.slice(0, 6)) { // Create transactions for first 6 accounts
    for (let i = 0; i < 10; i++) {
      const template = transactionTemplates[Math.floor(Math.random() * transactionTemplates.length)];
      const category = createdCategories.find(c => c.name === template.categoryName);

      const transaction = await prisma.transaction.create({
        data: {
          tenantId: defaultTenant.id,
          userId: account.userId,
          accountId: account.id,
          categoryId: category?.id,
          amount: template.amount,
          type: template.type,
          description: template.description,
          date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date in last 30 days
          status: TransactionStatus.COMPLETED,
          tags: ['demo', 'sample']
        }
      });
      createdTransactions.push(transaction);
    }
  }

  console.log(`✅ Created ${createdTransactions.length} sample transactions`);

  // Create sample budgets
  const budgetTemplates = [
    { name: 'Monthly Food Budget', amount: 800.00, categoryName: 'Food & Dining' },
    { name: 'Transportation Budget', amount: 300.00, categoryName: 'Transportation' },
    { name: 'Entertainment Budget', amount: 200.00, categoryName: 'Entertainment' },
    { name: 'Shopping Budget', amount: 400.00, categoryName: 'Shopping' }
  ];

  const createdBudgets = [];
  for (const user of [adminUser, ...createdUsers.slice(0, 2)]) {
    for (const budgetData of budgetTemplates) {
      const category = createdCategories.find(c => c.name === budgetData.categoryName);
      const userAccount = allAccounts.find(a => a.userId === user.id && a.type === AccountType.CHECKING);

      if (category && userAccount) {
        const budget = await prisma.budget.create({
          data: {
            tenantId: defaultTenant.id,
            userId: user.id,
            accountId: userAccount.id,
            categoryId: category.id,
            name: budgetData.name,
            description: `Monthly budget for ${budgetData.categoryName.toLowerCase()}`,
            amount: budgetData.amount,
            spent: Math.floor(Math.random() * budgetData.amount * 0.8), // Random spent amount
            period: BudgetPeriod.MONTHLY,
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
            alertThreshold: 80.0, // 80% threshold
            isActive: true
          }
        });
        createdBudgets.push(budget);
        console.log(`✅ Created budget: ${budget.name} for ${user.firstName}`);
      }
    }
  }

  // Create WhatsApp chats for demo
  const whatsappChats = [
    { phoneNumber: '+1234567890', displayName: 'John Doe' },
    { phoneNumber: '+1234567891', displayName: 'Jane Smith' }
  ];

  for (let i = 0; i < whatsappChats.length && i < createdUsers.length; i++) {
    const chatData = whatsappChats[i];
    const user = createdUsers[i];

    const chat = await prisma.whatsAppChat.create({
      data: {
        tenantId: defaultTenant.id,
        userId: user.id,
        phoneNumber: chatData.phoneNumber,
        displayName: chatData.displayName,
        isActive: true,
        lastMessageAt: new Date()
      }
    });
    console.log(`✅ Created WhatsApp chat: ${chat.displayName}`);
  }

  // Create audit logs for demonstration
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        action: 'CREATE',
        resource: 'tenant',
        resourceId: defaultTenant.id,
        newValues: { name: defaultTenant.name, slug: defaultTenant.slug },
        ipAddress: '127.0.0.1',
        userAgent: 'CHRONOS Seed Script',
        timestamp: new Date()
      },
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        action: 'CREATE',
        resource: 'user',
        resourceId: adminUser.id,
        newValues: { email: adminUser.email, role: adminUser.role },
        ipAddress: '127.0.0.1',
        userAgent: 'CHRONOS Seed Script',
        timestamp: new Date()
      }
    ]
  });

  console.log('✅ Created audit log entries');

  // Enable RLS policies for all tables
  await prisma.$executeRaw`
    -- Enable RLS on all tenant-scoped tables
    SELECT create_tenant_rls_policy('tenants');
    SELECT create_tenant_rls_policy('users');
    SELECT create_tenant_rls_policy('accounts');
    SELECT create_tenant_rls_policy('transactions');
    SELECT create_tenant_rls_policy('categories');
    SELECT create_tenant_rls_policy('budgets');
    SELECT create_tenant_rls_policy('whatsapp_chats');
    SELECT create_tenant_rls_policy('whatsapp_messages');
    SELECT create_tenant_rls_policy('audit_logs');
  `;

  console.log('✅ Enabled Row Level Security policies');

  console.log('🎉 Seed process completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • Tenant: ${defaultTenant.name} (${defaultTenant.slug})`);
  console.log(`   • Users: ${[adminUser, ...createdUsers].length} (1 admin, ${createdUsers.length} regular)`);
  console.log(`   • Categories: ${createdCategories.length}`);
  console.log(`   • Accounts: ${allAccounts.length}`);
  console.log(`   • Transactions: ${createdTransactions.length}`);
  console.log(`   • Budgets: ${createdBudgets.length}`);
  console.log('\n🔐 Login credentials:');
  console.log(`   Admin: admin@demo.local / admin123!`);
  console.log(`   User: john.doe@demo.local / user123!`);
  console.log(`   User: jane.smith@demo.local / user123!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });