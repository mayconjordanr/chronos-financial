import { FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from './transactions.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsSchema,
  createRecurringTransactionSchema,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  GetTransactionsRequest,
  CreateRecurringTransactionRequest
} from './transactions.dto';

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  async createTransaction(
    request: FastifyRequest<{ Body: CreateTransactionRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = createTransactionSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.createTransaction(
        validation.data,
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(201).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in createTransaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTransactions(
    request: FastifyRequest<{ Querystring: GetTransactionsRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = getTransactionsSchema.safeParse(request.query);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { page, limit, sortBy, sortOrder, ...filters } = validation.data;

      const result = await this.transactionService.getTransactions(
        userInfo.userId,
        userInfo.tenantId,
        filters,
        { page, limit, sortBy, sortOrder }
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in getTransactions:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTransaction(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.getTransaction(
        id,
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(404).send(result);
      }
    } catch (error) {
      console.error('Error in getTransaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateTransaction(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateTransactionRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const validation = updateTransactionSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.updateTransaction(
        id,
        validation.data,
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in updateTransaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteTransaction(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.deleteTransaction(
        id,
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async createRecurringTransaction(
    request: FastifyRequest<{ Body: CreateRecurringTransactionRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = createRecurringTransactionSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.createRecurringTransaction(
        validation.data,
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(201).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in createRecurringTransaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async generateRecurringTransactions(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await this.transactionService.generateRecurringTransactions(
        userInfo.userId,
        userInfo.tenantId
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in generateRecurringTransactions:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTransactionSummary(
    request: FastifyRequest<{
      Querystring: {
        startDate?: string;
        endDate?: string;
        accountId?: string;
        categoryId?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userInfo = (request as any).user;
      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { startDate, endDate, accountId, categoryId } = request.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (accountId) filters.accountId = accountId;
      if (categoryId) filters.categoryId = categoryId;

      const result = await this.transactionService.getTransactions(
        userInfo.userId,
        userInfo.tenantId,
        filters
      );

      if (!result.success || !result.transactions) {
        return reply.status(400).send(result);
      }

      // Calculate summary statistics
      const summary = {
        totalTransactions: result.transactions.length,
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        netFlow: 0,
        averageTransaction: 0,
        incomeTransactions: 0,
        expenseTransactions: 0,
        transferTransactions: 0
      };

      result.transactions.forEach(transaction => {
        const amount = Number(transaction.amount);

        switch (transaction.type) {
          case 'INCOME':
            summary.totalIncome += amount;
            summary.incomeTransactions++;
            break;
          case 'EXPENSE':
            summary.totalExpenses += amount;
            summary.expenseTransactions++;
            break;
          case 'TRANSFER':
            summary.totalTransfers += amount;
            summary.transferTransactions++;
            break;
        }
      });

      summary.netFlow = summary.totalIncome - summary.totalExpenses;
      summary.averageTransaction = summary.totalTransactions > 0
        ? (summary.totalIncome + summary.totalExpenses + summary.totalTransfers) / summary.totalTransactions
        : 0;

      return reply.status(200).send({
        success: true,
        message: 'Transaction summary retrieved successfully',
        summary
      });
    } catch (error) {
      console.error('Error in getTransactionSummary:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}