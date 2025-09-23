import { FastifyRequest, FastifyReply } from 'fastify';
import { AccountService } from './accounts.service';
export interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        userId: string;
        tenantId: string;
        email: string;
        role?: string;
    };
}
export declare class AccountController {
    private accountService;
    constructor(accountService: AccountService);
    createAccount(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getAccounts(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getAccount(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    updateAccount(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    deleteAccount(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    updateBalance(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getBalanceHistory(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getAccountSummary(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    private extractTenantContext;
    private handleError;
    healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    static validateTenantAccess(request: AuthenticatedRequest): boolean;
}
//# sourceMappingURL=accounts.controller.d.ts.map