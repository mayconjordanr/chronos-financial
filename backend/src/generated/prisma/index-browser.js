
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  subdomain: 'subdomain',
  domain: 'domain',
  settings: 'settings',
  features: 'features',
  limits: 'limits',
  subscriptionId: 'subscriptionId',
  planType: 'planType',
  billingCycle: 'billingCycle',
  trialEndsAt: 'trialEndsAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  avatarUrl: 'avatarUrl',
  passwordHash: 'passwordHash',
  emailVerifiedAt: 'emailVerifiedAt',
  lastLoginAt: 'lastLoginAt',
  language: 'language',
  timezone: 'timezone',
  preferences: 'preferences',
  role: 'role',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  token: 'token',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  refreshExpiresAt: 'refreshExpiresAt',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  device: 'device',
  isActive: 'isActive',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TenantInvitationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  role: 'role',
  token: 'token',
  status: 'status',
  expiresAt: 'expiresAt',
  acceptedAt: 'acceptedAt',
  invitedBy: 'invitedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  subtype: 'subtype',
  currency: 'currency',
  balance: 'balance',
  availableBalance: 'availableBalance',
  institutionId: 'institutionId',
  institutionName: 'institutionName',
  accountNumber: 'accountNumber',
  routingNumber: 'routingNumber',
  isActive: 'isActive',
  includeInBudget: 'includeInBudget',
  color: 'color',
  icon: 'icon',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastSyncAt: 'lastSyncAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  type: 'type',
  parentId: 'parentId',
  color: 'color',
  icon: 'icon',
  isSystem: 'isSystem',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  categoryId: 'categoryId',
  amount: 'amount',
  currency: 'currency',
  description: 'description',
  notes: 'notes',
  date: 'date',
  type: 'type',
  status: 'status',
  method: 'method',
  externalId: 'externalId',
  checkNumber: 'checkNumber',
  referenceNumber: 'referenceNumber',
  merchantName: 'merchantName',
  merchantCategory: 'merchantCategory',
  location: 'location',
  recurringId: 'recurringId',
  isRecurring: 'isRecurring',
  isAutoCategorized: 'isAutoCategorized',
  confidence: 'confidence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionSplitScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transactionId: 'transactionId',
  categoryId: 'categoryId',
  amount: 'amount',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionAttachmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transactionId: 'transactionId',
  fileName: 'fileName',
  fileType: 'fileType',
  fileSize: 'fileSize',
  fileUrl: 'fileUrl',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.RecurringTransactionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  categoryId: 'categoryId',
  amount: 'amount',
  description: 'description',
  frequency: 'frequency',
  interval: 'interval',
  dayOfWeek: 'dayOfWeek',
  dayOfMonth: 'dayOfMonth',
  monthOfYear: 'monthOfYear',
  startDate: 'startDate',
  endDate: 'endDate',
  nextDate: 'nextDate',
  isActive: 'isActive',
  lastProcessed: 'lastProcessed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BudgetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  categoryId: 'categoryId',
  accountId: 'accountId',
  amount: 'amount',
  period: 'period',
  startDate: 'startDate',
  endDate: 'endDate',
  spent: 'spent',
  remaining: 'remaining',
  percentUsed: 'percentUsed',
  alertThreshold: 'alertThreshold',
  alertSent: 'alertSent',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoalScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  type: 'type',
  targetAmount: 'targetAmount',
  currentAmount: 'currentAmount',
  targetDate: 'targetDate',
  accountId: 'accountId',
  percentComplete: 'percentComplete',
  isCompleted: 'isCompleted',
  completedAt: 'completedAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionRuleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  priority: 'priority',
  conditions: 'conditions',
  categoryId: 'categoryId',
  assignCategory: 'assignCategory',
  timesApplied: 'timesApplied',
  lastApplied: 'lastApplied',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WhatsAppSessionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  phoneNumber: 'phoneNumber',
  contactName: 'contactName',
  state: 'state',
  context: 'context',
  lastMessage: 'lastMessage',
  userId: 'userId',
  isAuthenticated: 'isAuthenticated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastActiveAt: 'lastActiveAt'
};

exports.Prisma.WhatsAppMessageScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  sessionId: 'sessionId',
  messageId: 'messageId',
  type: 'type',
  content: 'content',
  direction: 'direction',
  status: 'status',
  intent: 'intent',
  entities: 'entities',
  processed: 'processed',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  source: 'source',
  timestamp: 'timestamp'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.PlanType = exports.$Enums.PlanType = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
  CUSTOM: 'CUSTOM'
};

exports.BillingCycle = exports.$Enums.BillingCycle = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

exports.TenantStatus = exports.$Enums.TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED'
};

exports.UserRole = exports.$Enums.UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.InvitationStatus = exports.$Enums.InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.AccountType = exports.$Enums.AccountType = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  CREDIT_CARD: 'CREDIT_CARD',
  INVESTMENT: 'INVESTMENT',
  LOAN: 'LOAN',
  CASH: 'CASH',
  OTHER: 'OTHER'
};

exports.AccountSubtype = exports.$Enums.AccountSubtype = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  MONEY_MARKET: 'MONEY_MARKET',
  CD: 'CD',
  CREDIT_CARD: 'CREDIT_CARD',
  LINE_OF_CREDIT: 'LINE_OF_CREDIT',
  BROKERAGE: 'BROKERAGE',
  RETIREMENT: 'RETIREMENT',
  MORTGAGE: 'MORTGAGE',
  AUTO_LOAN: 'AUTO_LOAN',
  STUDENT_LOAN: 'STUDENT_LOAN',
  PERSONAL_LOAN: 'PERSONAL_LOAN',
  PREPAID: 'PREPAID',
  CASH: 'CASH'
};

exports.CategoryType = exports.$Enums.CategoryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  TRANSFER: 'TRANSFER'
};

exports.TransactionStatus = exports.$Enums.TransactionStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CHECK: 'CHECK',
  MOBILE_PAYMENT: 'MOBILE_PAYMENT',
  CRYPTOCURRENCY: 'CRYPTOCURRENCY',
  OTHER: 'OTHER'
};

exports.RecurrenceFrequency = exports.$Enums.RecurrenceFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

exports.BudgetPeriod = exports.$Enums.BudgetPeriod = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

exports.GoalType = exports.$Enums.GoalType = {
  SAVINGS: 'SAVINGS',
  DEBT_PAYOFF: 'DEBT_PAYOFF',
  INVESTMENT: 'INVESTMENT',
  PURCHASE: 'PURCHASE',
  EMERGENCY_FUND: 'EMERGENCY_FUND'
};

exports.WhatsAppState = exports.$Enums.WhatsAppState = {
  IDLE: 'IDLE',
  AUTHENTICATING: 'AUTHENTICATING',
  MAIN_MENU: 'MAIN_MENU',
  ADD_TRANSACTION: 'ADD_TRANSACTION',
  VIEW_BALANCE: 'VIEW_BALANCE',
  VIEW_TRANSACTIONS: 'VIEW_TRANSACTIONS',
  SET_BUDGET: 'SET_BUDGET',
  VIEW_REPORTS: 'VIEW_REPORTS'
};

exports.WhatsAppMessageType = exports.$Enums.WhatsAppMessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  LOCATION: 'LOCATION',
  CONTACT: 'CONTACT'
};

exports.MessageDirection = exports.$Enums.MessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
};

exports.MessageStatus = exports.$Enums.MessageStatus = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  User: 'User',
  UserSession: 'UserSession',
  TenantInvitation: 'TenantInvitation',
  Account: 'Account',
  Category: 'Category',
  Transaction: 'Transaction',
  TransactionSplit: 'TransactionSplit',
  TransactionAttachment: 'TransactionAttachment',
  RecurringTransaction: 'RecurringTransaction',
  Budget: 'Budget',
  Goal: 'Goal',
  TransactionRule: 'TransactionRule',
  WhatsAppSession: 'WhatsAppSession',
  WhatsAppMessage: 'WhatsAppMessage',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
