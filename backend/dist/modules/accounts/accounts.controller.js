"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountController = void 0;
const accounts_dto_1 = require("./accounts.dto");
const zod_1 = require("zod");
class AccountController {
    accountService;
    constructor(accountService) {
        this.accountService = accountService;
    }
    async createAccount(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const validatedData = accounts_dto_1.CreateAccountSchema.parse(request.body);
            const result = await this.accountService.createAccount(validatedData, userId, tenantId);
            if (result.success) {
                return reply.status(201).send({
                    success: true,
                    message: result.message,
                    account: result.account
                });
            }
            else {
                return reply.status(400).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async getAccounts(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const queryParams = accounts_dto_1.GetAccountsQuerySchema.parse(request.query);
            const { page, limit, sortBy, sortOrder, ...filters } = queryParams;
            const pagination = { page, limit, sortBy, sortOrder };
            const result = await this.accountService.getAccounts(userId, tenantId, filters, pagination);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    accounts: result.accounts,
                    total: result.total,
                    pagination: {
                        page,
                        limit,
                        totalPages: Math.ceil((result.total || 0) / limit)
                    }
                });
            }
            else {
                return reply.status(400).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async getAccount(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const { accountId } = accounts_dto_1.AccountParamsSchema.parse(request.params);
            const result = await this.accountService.getAccount(accountId, userId, tenantId);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    account: result.account
                });
            }
            else {
                const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
                return reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async updateAccount(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const { accountId } = accounts_dto_1.AccountParamsSchema.parse(request.params);
            const validatedData = accounts_dto_1.UpdateAccountSchema.parse(request.body);
            const result = await this.accountService.updateAccount(accountId, validatedData, userId, tenantId);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    account: result.account
                });
            }
            else {
                const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
                return reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async deleteAccount(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const { accountId } = accounts_dto_1.AccountParamsSchema.parse(request.params);
            const result = await this.accountService.deleteAccount(accountId, userId, tenantId);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message
                });
            }
            else {
                const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
                return reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async updateBalance(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const { accountId } = accounts_dto_1.AccountParamsSchema.parse(request.params);
            const validatedData = accounts_dto_1.UpdateBalanceSchema.parse(request.body);
            const result = await this.accountService.updateBalance(accountId, validatedData.amount, userId, tenantId, validatedData.description);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    account: result.account,
                    balanceHistory: result.balanceHistory
                });
            }
            else {
                const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
                return reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async getBalanceHistory(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const { accountId } = accounts_dto_1.AccountParamsSchema.parse(request.params);
            const queryParams = accounts_dto_1.GetBalanceHistoryQuerySchema.parse(request.query);
            const result = await this.accountService.getBalanceHistory(accountId, userId, tenantId, queryParams);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    history: result.history,
                    pagination: {
                        page: queryParams.page,
                        limit: queryParams.limit
                    }
                });
            }
            else {
                const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
                return reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    async getAccountSummary(request, reply) {
        try {
            const { userId, tenantId } = this.extractTenantContext(request);
            const result = await this.accountService.getAccountSummary(userId, tenantId);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    summary: result.summary
                });
            }
            else {
                return reply.status(400).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            return this.handleError(error, reply);
        }
    }
    extractTenantContext(request) {
        if (!request.user) {
            throw new Error('Authentication required');
        }
        const { userId, tenantId, email, role } = request.user;
        if (!userId || !tenantId) {
            throw new Error('Invalid authentication context');
        }
        return {
            tenantId,
            userId,
            userRole: role,
            userEmail: email
        };
    }
    handleError(error, reply) {
        if (error instanceof zod_1.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));
            const response = {
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            };
            return reply.status(422).send(response);
        }
        if (error instanceof Error) {
            if (error.message.includes('Authentication required') ||
                error.message.includes('Invalid authentication context')) {
                const response = {
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                };
                return reply.status(401).send(response);
            }
            if (error.message.includes('not found') ||
                error.message.includes('access denied')) {
                const response = {
                    success: false,
                    message: 'Resource not found or access denied',
                    code: 'NOT_FOUND'
                };
                return reply.status(404).send(response);
            }
            if (error.message.includes('already exists')) {
                const response = {
                    success: false,
                    message: error.message,
                    code: 'DUPLICATE_RESOURCE'
                };
                return reply.status(409).send(response);
            }
            console.error('Account controller error:', error);
            const response = {
                success: false,
                message: error.message || 'An unexpected error occurred',
                code: 'INTERNAL_ERROR'
            };
            return reply.status(500).send(response);
        }
        console.error('Unknown error in account controller:', error);
        const response = {
            success: false,
            message: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR'
        };
        return reply.status(500).send(response);
    }
    async healthCheck(request, reply) {
        return reply.status(200).send({
            success: true,
            message: 'Accounts module is healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
    static validateTenantAccess(request) {
        try {
            const tenantContext = request.user;
            return !!(tenantContext?.userId && tenantContext?.tenantId);
        }
        catch {
            return false;
        }
    }
}
exports.AccountController = AccountController;
//# sourceMappingURL=accounts.controller.js.map