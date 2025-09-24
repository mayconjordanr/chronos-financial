import { z } from 'zod'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const EnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Server Configuration
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().default(10000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().default(5000),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Supabase (optional)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Twilio/WhatsApp (optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default('CHRONOS Financial'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),

  // Feature Flags
  FEATURE_MULTI_TENANT: z.coerce.boolean().default(true),
  FEATURE_REAL_TIME_UPDATES: z.coerce.boolean().default(true),
  FEATURE_WHATSAPP_INTEGRATION: z.coerce.boolean().default(false),
  FEATURE_STRIPE_INTEGRATION: z.coerce.boolean().default(false),
  FEATURE_ANALYTICS: z.coerce.boolean().default(true),

  // Multi-tenancy
  DEFAULT_TENANT_LIMITS_USERS: z.coerce.number().default(100),
  DEFAULT_TENANT_LIMITS_TRANSACTIONS: z.coerce.number().default(10000),
  DEFAULT_TENANT_LIMITS_ACCOUNTS: z.coerce.number().default(20),
  DEFAULT_TENANT_LIMITS_STORAGE_MB: z.coerce.number().default(1024),
  TENANT_ISOLATION_STRICT: z.coerce.boolean().default(true),
})

// Parse and validate environment variables
const parseResult = EnvSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:')
  parseResult.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

const env = parseResult.data

// Derived configurations
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isStaging: env.NODE_ENV === 'staging',

  app: {
    port: env.PORT,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
    apiUrl: `http://${env.HOST}:${env.PORT}`,
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT,
    commandTimeout: env.REDIS_COMMAND_TIMEOUT,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    sessionSecret: env.SESSION_SECRET,
  },

  cors: {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: env.CORS_CREDENTIALS,
  },

  rateLimit: {
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
  },

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    enabled: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    enabled: !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY),
  },

  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    whatsappNumber: env.TWILIO_WHATSAPP_NUMBER,
    enabled: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
  },

  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME,
    enabled: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
  },

  monitoring: {
    sentryDsn: env.SENTRY_DSN,
    newRelicLicenseKey: env.NEW_RELIC_LICENSE_KEY,
  },

  features: {
    multiTenant: env.FEATURE_MULTI_TENANT,
    realTimeUpdates: env.FEATURE_REAL_TIME_UPDATES,
    whatsappIntegration: env.FEATURE_WHATSAPP_INTEGRATION,
    stripeIntegration: env.FEATURE_STRIPE_INTEGRATION,
    analytics: env.FEATURE_ANALYTICS,
  },

  tenant: {
    isolationStrict: env.TENANT_ISOLATION_STRICT,
    defaultLimits: {
      users: env.DEFAULT_TENANT_LIMITS_USERS,
      transactions: env.DEFAULT_TENANT_LIMITS_TRANSACTIONS,
      accounts: env.DEFAULT_TENANT_LIMITS_ACCOUNTS,
      storageMb: env.DEFAULT_TENANT_LIMITS_STORAGE_MB,
    },
  },
} as const

// Export individual configurations
export { env }

// Type definitions
export type Config = typeof config
export type Env = typeof env