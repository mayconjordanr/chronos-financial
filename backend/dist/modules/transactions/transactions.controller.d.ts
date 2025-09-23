import { FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from './transactions.service';
import { CreateTransactionRequest, UpdateTransactionRequest, GetTransactionsRequest, CreateRecurringTransactionRequest } from './transactions.dto';
export declare class TransactionController {
    private transactionService;
    constructor(transactionService: TransactionService);
    createTransaction(request: FastifyRequest<{
        Body: CreateTransactionRequest;
    }>, reply: FastifyReply): Promise<never>;
    getTransactions(request: FastifyRequest<{
        Querystring: GetTransactionsRequest;
    }>, reply: FastifyReply): Promise<never>;
    getTransaction(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    updateTransaction(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: UpdateTransactionRequest;
    }>, reply: FastifyReply): Promise<never>;
    deleteTransaction(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    createRecurringTransaction(request: FastifyRequest<{
        Body: CreateRecurringTransactionRequest;
    }>, reply: FastifyReply): Promise<never>;
    generateRecurringTransactions(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getTransactionSummary(request: FastifyRequest<{
        Querystring: {
            startDate?: string;
            endDate?: string;
            accountId?: string;
            categoryId?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=transactions.controller.d.ts.map