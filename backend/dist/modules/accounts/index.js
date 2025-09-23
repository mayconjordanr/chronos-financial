"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNTS_MODULE_INFO = exports.ACCOUNTS_MODULE_NAME = exports.ACCOUNTS_MODULE_VERSION = exports.OpenAPISchemas = exports.TenantContextSchema = exports.PaginationSchema = exports.AccountFiltersSchema = exports.GetBalanceHistoryQuerySchema = exports.GetAccountsQuerySchema = exports.AccountParamsSchema = exports.UpdateBalanceSchema = exports.UpdateAccountSchema = exports.CreateAccountSchema = exports.accountsPlugin = exports.accountRoutes = exports.AccountController = exports.AccountService = void 0;
var accounts_service_1 = require("./accounts.service");
Object.defineProperty(exports, "AccountService", { enumerable: true, get: function () { return accounts_service_1.AccountService; } });
var accounts_controller_1 = require("./accounts.controller");
Object.defineProperty(exports, "AccountController", { enumerable: true, get: function () { return accounts_controller_1.AccountController; } });
var accounts_routes_1 = require("./accounts.routes");
Object.defineProperty(exports, "accountRoutes", { enumerable: true, get: function () { return accounts_routes_1.accountRoutes; } });
Object.defineProperty(exports, "accountsPlugin", { enumerable: true, get: function () { return accounts_routes_1.accountsPlugin; } });
var accounts_dto_1 = require("./accounts.dto");
Object.defineProperty(exports, "CreateAccountSchema", { enumerable: true, get: function () { return accounts_dto_1.CreateAccountSchema; } });
Object.defineProperty(exports, "UpdateAccountSchema", { enumerable: true, get: function () { return accounts_dto_1.UpdateAccountSchema; } });
Object.defineProperty(exports, "UpdateBalanceSchema", { enumerable: true, get: function () { return accounts_dto_1.UpdateBalanceSchema; } });
Object.defineProperty(exports, "AccountParamsSchema", { enumerable: true, get: function () { return accounts_dto_1.AccountParamsSchema; } });
Object.defineProperty(exports, "GetAccountsQuerySchema", { enumerable: true, get: function () { return accounts_dto_1.GetAccountsQuerySchema; } });
Object.defineProperty(exports, "GetBalanceHistoryQuerySchema", { enumerable: true, get: function () { return accounts_dto_1.GetBalanceHistoryQuerySchema; } });
Object.defineProperty(exports, "AccountFiltersSchema", { enumerable: true, get: function () { return accounts_dto_1.AccountFiltersSchema; } });
Object.defineProperty(exports, "PaginationSchema", { enumerable: true, get: function () { return accounts_dto_1.PaginationSchema; } });
Object.defineProperty(exports, "TenantContextSchema", { enumerable: true, get: function () { return accounts_dto_1.TenantContextSchema; } });
Object.defineProperty(exports, "OpenAPISchemas", { enumerable: true, get: function () { return accounts_dto_1.OpenAPISchemas; } });
exports.ACCOUNTS_MODULE_VERSION = '1.0.0';
exports.ACCOUNTS_MODULE_NAME = 'accounts';
exports.ACCOUNTS_MODULE_INFO = {
    name: exports.ACCOUNTS_MODULE_NAME,
    version: exports.ACCOUNTS_MODULE_VERSION,
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
};
//# sourceMappingURL=index.js.map