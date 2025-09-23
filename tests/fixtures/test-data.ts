import { Tenant, User, Account, Transaction, Category, Budget, TenantPlan, UserRole, AccountType, TransactionType, BudgetPeriod } from '@prisma/client'

// Test data fixtures for consistent testing
export const TEST_TENANTS: Partial<Tenant>[] = [
  {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    domain: 'acme.chronos.app',
    plan: 'PREMIUM' as TenantPlan,
    currency: 'USD',
    timezone: 'America/New_York',
    locale: 'en-US',
    settings: {
      features: {
        whatsappIntegration: true,
        budgetAlerts: true,
        categoryManagement: true,
        multiCurrency: true
      },
      limits: {
        users: 100,
        transactions: 10000,
        accounts: 20
      },
      branding: {
        primaryColor: '#1E40AF',
        logo: 'https://acme.com/logo.png'
      }
    }
  },
  {
    name: 'Small Business Inc',
    slug: 'small-business',
    domain: 'smallbiz.chronos.app',
    plan: 'BASIC' as TenantPlan,
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    settings: {
      features: {
        whatsappIntegration: false,
        budgetAlerts: true,
        categoryManagement: true,
        multiCurrency: false
      },
      limits: {
        users: 5,
        transactions: 1000,
        accounts: 3
      }
    }
  },
  {
    name: 'Startup Dynamics',
    slug: 'startup-dynamics',
    domain: 'startup.chronos.app',
    plan: 'FREE' as TenantPlan,
    currency: 'USD',
    timezone: 'UTC',
    locale: 'en',
    settings: {
      features: {
        whatsappIntegration: false,
        budgetAlerts: false,
        categoryManagement: true,
        multiCurrency: false
      },
      limits: {
        users: 2,
        transactions: 100,
        accounts: 2
      }
    }
  }
]

export const TEST_USERS: Partial<User>[] = [
  {
    email: 'admin@acme.com',
    username: 'acme_admin',
    firstName: 'John',
    lastName: 'Admin',
    role: 'TENANT_ADMIN' as UserRole,
    phone: '+1-555-0101',
    isEmailVerified: true
  },
  {
    email: 'user@acme.com',
    username: 'acme_user',
    firstName: 'Jane',
    lastName: 'User',
    role: 'USER' as UserRole,
    phone: '+1-555-0102',
    isEmailVerified: true
  },
  {
    email: 'viewer@acme.com',
    username: 'acme_viewer',
    firstName: 'Bob',
    lastName: 'Viewer',
    role: 'VIEWER' as UserRole,
    isEmailVerified: false
  },
  {
    email: 'owner@smallbiz.com',
    username: 'smallbiz_owner',
    firstName: 'Alice',
    lastName: 'Owner',
    role: 'TENANT_ADMIN' as UserRole,
    phone: '+1-555-0201',
    isEmailVerified: true
  },
  {
    email: 'employee@smallbiz.com',
    username: 'smallbiz_employee',
    firstName: 'Charlie',
    lastName: 'Employee',
    role: 'USER' as UserRole,
    isEmailVerified: true
  }
]

export const TEST_ACCOUNTS: Partial<Account>[] = [
  {
    name: 'Primary Checking',
    type: 'CHECKING' as AccountType,
    balance: 5000.00,
    currency: 'USD',
    description: 'Main business checking account',
    bankName: 'First National Bank',
    accountNumber: 'XXXX-1234',
    routingNumber: '123456789'
  },
  {
    name: 'Business Savings',
    type: 'SAVINGS' as AccountType,
    balance: 25000.00,
    currency: 'USD',
    description: 'Emergency fund savings account',
    bankName: 'First National Bank',
    accountNumber: 'XXXX-5678'
  },
  {
    name: 'Company Credit Card',
    type: 'CREDIT_CARD' as AccountType,
    balance: -1200.00,
    currency: 'USD',
    description: 'Business expenses credit card',
    bankName: 'Business Credit Union',
    accountNumber: 'XXXX-9999'
  },
  {
    name: 'Investment Account',
    type: 'INVESTMENT' as AccountType,
    balance: 50000.00,
    currency: 'USD',
    description: 'Long-term investment portfolio',
    bankName: 'Investment Partners'
  },
  {
    name: 'Petty Cash',
    type: 'CASH' as AccountType,
    balance: 500.00,
    currency: 'USD',
    description: 'Office petty cash fund'
  }
]

export const TEST_CATEGORIES = [
  {
    name: 'Income',
    description: 'All sources of income',
    color: '#16A34A',
    icon: 'income',
    isSystem: true
  },
  {
    name: 'Office Expenses',
    description: 'General office and administrative expenses',
    color: '#DC2626',
    icon: 'office'
  },
  {
    name: 'Marketing',
    description: 'Marketing and advertising expenses',
    color: '#7C3AED',
    icon: 'marketing'
  },
  {
    name: 'Travel',
    description: 'Business travel and transportation',
    color: '#EA580C',
    icon: 'travel'
  },
  {
    name: 'Equipment',
    description: 'Office equipment and technology purchases',
    color: '#0891B2',
    icon: 'equipment'
  },
  {
    name: 'Utilities',
    description: 'Electricity, water, internet, phone',
    color: '#65A30D',
    icon: 'utilities'
  },
  {
    name: 'Professional Services',
    description: 'Legal, accounting, consulting fees',
    color: '#4338CA',
    icon: 'services'
  },
  {
    name: 'Food & Entertainment',
    description: 'Meals, client entertainment',
    color: '#BE185D',
    icon: 'dining'
  }
]

export const TEST_TRANSACTIONS: Partial<Transaction>[] = [
  {
    amount: 5000.00,
    type: 'INCOME' as TransactionType,
    description: 'Client payment - Web development project',
    notes: 'Monthly retainer from Acme Client',
    date: new Date('2024-01-15'),
    status: 'COMPLETED',
    reference: 'INV-2024-001',
    tags: ['client-payment', 'web-dev', 'recurring']
  },
  {
    amount: 1200.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Office rent - January 2024',
    notes: 'Monthly office space rental',
    date: new Date('2024-01-01'),
    status: 'COMPLETED',
    reference: 'RENT-2024-01',
    tags: ['rent', 'office', 'monthly']
  },
  {
    amount: 350.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Marketing campaign - Google Ads',
    notes: 'Q1 digital marketing campaign',
    date: new Date('2024-01-10'),
    status: 'COMPLETED',
    reference: 'MKT-2024-001',
    tags: ['marketing', 'google-ads', 'digital']
  },
  {
    amount: 850.00,
    type: 'EXPENSE' as TransactionType,
    description: 'New laptop purchase',
    notes: 'MacBook Pro for new developer',
    date: new Date('2024-01-12'),
    status: 'COMPLETED',
    reference: 'EQ-2024-001',
    tags: ['equipment', 'laptop', 'developer']
  },
  {
    amount: 125.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Client lunch meeting',
    notes: 'Lunch with potential client at downtown restaurant',
    date: new Date('2024-01-18'),
    status: 'COMPLETED',
    tags: ['meals', 'client', 'business-development']
  },
  {
    amount: 2500.00,
    type: 'INCOME' as TransactionType,
    description: 'Consulting services - Strategy session',
    notes: 'Three-day strategic planning consultation',
    date: new Date('2024-01-20'),
    status: 'COMPLETED',
    reference: 'CONS-2024-001',
    tags: ['consulting', 'strategy', 'project']
  },
  {
    amount: 450.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Conference registration',
    notes: 'TechConf 2024 registration and materials',
    date: new Date('2024-01-08'),
    status: 'COMPLETED',
    reference: 'CONF-2024-001',
    tags: ['conference', 'professional-development', 'tech']
  },
  {
    amount: 75.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Office supplies',
    notes: 'Printer paper, pens, notebooks',
    date: new Date('2024-01-05'),
    status: 'COMPLETED',
    tags: ['supplies', 'office', 'stationery']
  },
  {
    amount: 200.00,
    type: 'EXPENSE' as TransactionType,
    description: 'Monthly software subscriptions',
    notes: 'Adobe Creative Suite, Slack Pro, GitHub',
    date: new Date('2024-01-01'),
    status: 'COMPLETED',
    reference: 'SUB-2024-001',
    tags: ['software', 'subscriptions', 'tools']
  },
  {
    amount: 1000.00,
    type: 'TRANSFER' as TransactionType,
    description: 'Transfer to savings account',
    notes: 'Monthly transfer to emergency fund',
    date: new Date('2024-01-25'),
    status: 'COMPLETED',
    reference: 'XFER-2024-001',
    tags: ['transfer', 'savings', 'emergency-fund']
  }
]

export const TEST_BUDGETS: Partial<Budget>[] = [
  {
    name: 'Marketing Budget Q1 2024',
    description: 'First quarter marketing and advertising budget',
    amount: 5000.00,
    spent: 1250.00,
    period: 'QUARTERLY' as BudgetPeriod,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    alertThreshold: 80.0
  },
  {
    name: 'Office Expenses - Monthly',
    description: 'Monthly office expenses including rent and utilities',
    amount: 2000.00,
    spent: 1575.00,
    period: 'MONTHLY' as BudgetPeriod,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    alertThreshold: 90.0
  },
  {
    name: 'Equipment & Technology',
    description: 'Annual budget for equipment purchases and upgrades',
    amount: 15000.00,
    spent: 2300.00,
    period: 'YEARLY' as BudgetPeriod,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    alertThreshold: 75.0
  },
  {
    name: 'Travel & Transportation',
    description: 'Business travel budget for conferences and client visits',
    amount: 8000.00,
    spent: 450.00,
    period: 'YEARLY' as BudgetPeriod,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    alertThreshold: 85.0
  },
  {
    name: 'Professional Development',
    description: 'Training, courses, and professional growth budget',
    amount: 3000.00,
    spent: 450.00,
    period: 'YEARLY' as BudgetPeriod,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    alertThreshold: 70.0
  }
]

// WhatsApp test data
export const TEST_WHATSAPP_CHATS = [
  {
    phoneNumber: '+1234567890',
    displayName: 'John Business',
    isActive: true,
    lastMessageAt: new Date('2024-01-25T10:30:00Z')
  },
  {
    phoneNumber: '+0987654321',
    displayName: 'Jane Client',
    isActive: true,
    lastMessageAt: new Date('2024-01-24T15:45:00Z')
  }
]

export const TEST_WHATSAPP_MESSAGES = [
  {
    messageId: 'wa_msg_001',
    direction: 'INBOUND',
    content: 'Paid $150 for office supplies today',
    messageType: 'TEXT',
    status: 'READ',
    timestamp: new Date('2024-01-25T10:30:00Z'),
    extractedAmount: 150.00,
    extractedDescription: 'office supplies',
    extractedCategory: 'Office Expenses',
    isProcessed: true
  },
  {
    messageId: 'wa_msg_002',
    direction: 'INBOUND',
    content: 'Client lunch meeting - $85 at downtown restaurant',
    messageType: 'TEXT',
    status: 'READ',
    timestamp: new Date('2024-01-24T12:15:00Z'),
    extractedAmount: 85.00,
    extractedDescription: 'Client lunch meeting at downtown restaurant',
    extractedCategory: 'Food & Entertainment',
    isProcessed: true
  },
  {
    messageId: 'wa_msg_003',
    direction: 'OUTBOUND',
    content: 'Transaction recorded: $150 for office supplies',
    messageType: 'TEXT',
    status: 'DELIVERED',
    timestamp: new Date('2024-01-25T10:31:00Z'),
    isProcessed: true
  }
]

// Audit log test data
export const TEST_AUDIT_LOGS = [
  {
    action: 'CREATE',
    resource: 'transaction',
    newValues: {
      amount: 150.00,
      description: 'Office supplies',
      type: 'EXPENSE'
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: new Date('2024-01-25T10:30:00Z')
  },
  {
    action: 'UPDATE',
    resource: 'user',
    resourceId: 'user_123',
    oldValues: {
      firstName: 'John',
      lastName: 'Doe'
    },
    newValues: {
      firstName: 'John',
      lastName: 'Smith'
    },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2024-01-24T14:22:00Z')
  },
  {
    action: 'DELETE',
    resource: 'category',
    resourceId: 'cat_456',
    oldValues: {
      name: 'Old Category',
      description: 'No longer needed'
    },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    timestamp: new Date('2024-01-23T09:15:00Z')
  }
]

// Performance test data generators
export const generateLargeTransactionDataset = (count: number, tenantId: string, userId: string, accountId: string) => {
  const transactions = []
  const categories = ['income', 'office', 'marketing', 'travel', 'equipment']
  const types: TransactionType[] = ['INCOME', 'EXPENSE', 'TRANSFER']

  for (let i = 0; i < count; i++) {
    transactions.push({
      tenantId,
      userId,
      accountId,
      amount: parseFloat((Math.random() * 2000 + 10).toFixed(2)),
      type: types[Math.floor(Math.random() * types.length)],
      description: `Generated transaction ${i + 1} - ${categories[Math.floor(Math.random() * categories.length)]}`,
      notes: `Performance test transaction generated at ${new Date().toISOString()}`,
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
      status: 'COMPLETED',
      reference: `PERF-${String(i + 1).padStart(6, '0')}`,
      tags: [`perf-test`, `batch-${Math.floor(i / 100) + 1}`, categories[Math.floor(Math.random() * categories.length)]]
    })
  }

  return transactions
}

export const generateUserDataset = (count: number, tenantId: string) => {
  const users = []
  const roles: UserRole[] = ['USER', 'VIEWER', 'TENANT_ADMIN']

  for (let i = 0; i < count; i++) {
    users.push({
      tenantId,
      email: `testuser${i + 1}@example.com`,
      username: `testuser${i + 1}`,
      firstName: `FirstName${i + 1}`,
      lastName: `LastName${i + 1}`,
      password: 'hashedpassword',
      role: roles[Math.floor(Math.random() * roles.length)],
      phone: `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      isEmailVerified: Math.random() > 0.3
    })
  }

  return users
}

// Security test data
export const MALICIOUS_INPUTS = [
  // SQL Injection attempts
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM transactions --",
  "admin'--",
  "admin'/*",

  // XSS attempts
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",

  // Path traversal
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",

  // Command injection
  "; ls -la",
  "| cat /etc/passwd",
  "&& rm -rf /",

  // Unicode attacks
  "\\u0027\\u0020OR\\u0020\\u0027\\u0031\\u0027\\u003d\\u0027\\u0031",
  "\\u003cscript\\u003ealert\\u0028\\u0027xss\\u0027\\u0029\\u003c/script\\u003e"
]

export const EDGE_CASE_INPUTS = [
  '', // Empty string
  ' ', // Space
  '\n', // Newline
  '\t', // Tab
  '\r\n', // CRLF
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '-Infinity',
  '0',
  '-1',
  '999999999999999999', // Very large number
  'a'.repeat(1000), // Very long string
  '🚀💰📊', // Emojis
  'café', // Unicode
  '测试', // Chinese characters
  'тест', // Cyrillic
  '🏦💸📈💳', // Financial emojis
]

export default {
  TEST_TENANTS,
  TEST_USERS,
  TEST_ACCOUNTS,
  TEST_CATEGORIES,
  TEST_TRANSACTIONS,
  TEST_BUDGETS,
  TEST_WHATSAPP_CHATS,
  TEST_WHATSAPP_MESSAGES,
  TEST_AUDIT_LOGS,
  generateLargeTransactionDataset,
  generateUserDataset,
  MALICIOUS_INPUTS,
  EDGE_CASE_INPUTS
}