// Accounts Module - Entry Point
// This file provides a clean interface for the accounts module

export { AccountService } from './accounts.service';
export { AccountController } from './accounts.controller';
export { accountRoutes, accountsPlugin } from './accounts.routes';

// Export DTOs and validation schemas
export {
  CreateAccountSchema,
  UpdateAccountSchema,
  UpdateBalanceSchema,
  AccountParamsSchema,
  GetAccountsQuerySchema,
  GetBalanceHistoryQuerySchema,
  AccountFiltersSchema,
  PaginationSchema,
  TenantContextSchema,
  OpenAPISchemas
} from './accounts.dto';

// Export TypeScript interfaces
export type {
  CreateAccountDto,
  UpdateAccountDto,
  UpdateBalanceDto,
  AccountParamsDto,
  GetAccountsQueryDto,
  GetBalanceHistoryQueryDto,
  AccountFiltersDto,
  PaginationDto,
  TenantContextDto,
  AccountResponseDto,
  AccountListResponseDto,
  AccountSingleResponseDto,
  BalanceHistoryItemDto,
  BalanceHistoryResponseDto,
  AccountSummaryResponseDto,
  ErrorResponseDto,
  ValidationErrorResponseDto
} from './accounts.dto';

// Export service interfaces
export type {
  CreateAccountData,
  UpdateAccountData,
  AccountFilters,
  AccountResult,
  AccountsResult,
  BalanceUpdateResult,
  BalanceHistoryResult,
  BalanceHistory,
  PaginationOptions
} from './accounts.service';

// Export controller interfaces
export type { AuthenticatedRequest } from './accounts.controller';

// Export route options
export type { AccountRoutesOptions } from './accounts.routes';

// Module version and metadata
export const ACCOUNTS_MODULE_VERSION = '1.0.0';
export const ACCOUNTS_MODULE_NAME = 'accounts';

// Module description for documentation
export const ACCOUNTS_MODULE_INFO = {
  name: ACCOUNTS_MODULE_NAME,
  version: ACCOUNTS_MODULE_VERSION,
  description: 'Multi-tenant financial accounts management module with secure tenant isolation',
  features: [
    'Complete CRUD operations for accounts',
    'Multi-tenant isolation with RLS patterns',
    'Balance management with transaction logging',
    'Account type support (CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT)',
    'Balance history tracking',
    'Account summary and reporting',
    'Comprehensive validation with Zod',
    'OpenAPI documentation'
  ],
  security: [
    'Tenant isolation on all operations',
    'User ownership validation',
    'Input validation and sanitization',
    'SQL injection prevention',
    'Cross-tenant access prevention'
  ]
} as const;