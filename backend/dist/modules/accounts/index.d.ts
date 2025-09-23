export { AccountService } from './accounts.service';
export { AccountController } from './accounts.controller';
export { accountRoutes, accountsPlugin } from './accounts.routes';
export { CreateAccountSchema, UpdateAccountSchema, UpdateBalanceSchema, AccountParamsSchema, GetAccountsQuerySchema, GetBalanceHistoryQuerySchema, AccountFiltersSchema, PaginationSchema, TenantContextSchema, OpenAPISchemas } from './accounts.dto';
export type { CreateAccountDto, UpdateAccountDto, UpdateBalanceDto, AccountParamsDto, GetAccountsQueryDto, GetBalanceHistoryQueryDto, AccountFiltersDto, PaginationDto, TenantContextDto, AccountResponseDto, AccountListResponseDto, AccountSingleResponseDto, BalanceHistoryItemDto, BalanceHistoryResponseDto, AccountSummaryResponseDto, ErrorResponseDto, ValidationErrorResponseDto } from './accounts.dto';
export type { CreateAccountData, UpdateAccountData, AccountFilters, AccountResult, AccountsResult, BalanceUpdateResult, BalanceHistoryResult, BalanceHistory, PaginationOptions } from './accounts.service';
export type { AuthenticatedRequest } from './accounts.controller';
export type { AccountRoutesOptions } from './accounts.routes';
export declare const ACCOUNTS_MODULE_VERSION = "1.0.0";
export declare const ACCOUNTS_MODULE_NAME = "accounts";
export declare const ACCOUNTS_MODULE_INFO: {
    readonly name: "accounts";
    readonly version: "1.0.0";
    readonly description: "Multi-tenant financial accounts management module with secure tenant isolation";
    readonly features: readonly ["Complete CRUD operations for accounts", "Multi-tenant isolation with RLS patterns", "Balance management with transaction logging", "Account type support (CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT)", "Balance history tracking", "Account summary and reporting", "Comprehensive validation with Zod", "OpenAPI documentation"];
    readonly security: readonly ["Tenant isolation on all operations", "User ownership validation", "Input validation and sanitization", "SQL injection prevention", "Cross-tenant access prevention"];
};
//# sourceMappingURL=index.d.ts.map