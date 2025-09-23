import { CommandHandler } from '../../services/whatsapp/commands';
import { ParsedMessage } from '../../services/whatsapp/parser';
import { WebhookContext } from '../../services/whatsapp/webhook';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../services/whatsapp/client');

const mockPrisma = {
  account: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    groupBy: jest.fn(),
  },
  budget: {
    findMany: jest.fn(),
  },
  balanceHistory: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  const mockContext: WebhookContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    whatsappUser: {
      id: 'wa-user-1',
      phoneNumber: '+1234567890',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    commandHandler = new CommandHandler();
  });

  describe('handleAddExpense', () => {
    const expenseMessage: ParsedMessage = {
      intent: 'add_expense',
      entities: {
        amount: 50,
        category: 'food',
        description: 'lunch',
      },
      confidence: 0.9,
      originalMessage: 'add expense 50 food lunch',
    };

    it('should create expense transaction successfully', async () => {
      // Mock default account
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        name: 'Checking',
        balance: 1000,
        type: 'CHECKING',
      });

      // Mock category
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-1',
        name: 'Food',
      });

      // Mock transaction creation
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
        amount: 50,
        type: 'EXPENSE',
      });

      await commandHandler.handleCommand(expenseMessage, '+1234567890', mockContext);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          accountId: 'account-1',
          categoryId: 'category-1',
          amount: 50,
          type: 'EXPENSE',
          description: 'lunch',
          date: expect.any(Date),
          status: 'COMPLETED',
        },
      });

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { balance: 950 },
      });
    });

    it('should handle missing amount', async () => {
      const invalidMessage: ParsedMessage = {
        ...expenseMessage,
        entities: { category: 'food' }, // No amount
      };

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(invalidMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'Please specify an amount. Example: "add expense 50 food"'
      );
    });

    it('should handle no accounts found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(expenseMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'No accounts found. Please create an account first.'
      );
    });

    it('should create category if not exists', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        name: 'Checking',
        balance: 1000,
        type: 'CHECKING',
      });

      // Category not found
      mockPrisma.category.findFirst.mockResolvedValue(null);

      // Mock category creation
      mockPrisma.category.create.mockResolvedValue({
        id: 'category-new',
        name: 'food',
      });

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
      });

      await commandHandler.handleCommand(expenseMessage, '+1234567890', mockContext);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          name: 'food',
          description: 'Auto-created from WhatsApp',
          isSystem: false,
        },
      });
    });
  });

  describe('handleAddIncome', () => {
    const incomeMessage: ParsedMessage = {
      intent: 'add_income',
      entities: {
        amount: 5000,
        category: 'salary',
        description: 'monthly salary',
      },
      confidence: 0.9,
      originalMessage: 'income 5000 salary',
    };

    it('should create income transaction successfully', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        name: 'Checking',
        balance: 1000,
        type: 'CHECKING',
      });

      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-1',
        name: 'Salary',
      });

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
      });

      await commandHandler.handleCommand(incomeMessage, '+1234567890', mockContext);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          accountId: 'account-1',
          categoryId: 'category-1',
          amount: 5000,
          type: 'INCOME',
          description: 'monthly salary',
          date: expect.any(Date),
          status: 'COMPLETED',
        },
      });

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { balance: 6000 },
      });
    });
  });

  describe('handleTransfer', () => {
    const transferMessage: ParsedMessage = {
      intent: 'transfer',
      entities: {
        amount: 200,
        accountFrom: 'checking',
        accountTo: 'savings',
      },
      confidence: 0.9,
      originalMessage: 'transfer 200 from checking to savings',
    };

    it('should process transfer successfully', async () => {
      const checkingAccount = {
        id: 'account-1',
        name: 'Checking',
        balance: { toNumber: () => 1000 },
        type: 'CHECKING',
      };

      const savingsAccount = {
        id: 'account-2',
        name: 'Savings',
        balance: { toNumber: () => 500 },
        type: 'SAVINGS',
      };

      mockPrisma.account.findFirst
        .mockResolvedValueOnce(checkingAccount) // From account
        .mockResolvedValueOnce(savingsAccount); // To account

      // Mock transaction wrapper
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            create: jest.fn(),
          },
          account: {
            update: jest.fn(),
          },
          balanceHistory: {
            createMany: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      await commandHandler.handleCommand(transferMessage, '+1234567890', mockContext);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle insufficient balance', async () => {
      const checkingAccount = {
        id: 'account-1',
        name: 'Checking',
        balance: { toNumber: () => 100 }, // Less than transfer amount
        type: 'CHECKING',
      };

      const savingsAccount = {
        id: 'account-2',
        name: 'Savings',
        balance: { toNumber: () => 500 },
        type: 'SAVINGS',
      };

      mockPrisma.account.findFirst
        .mockResolvedValueOnce(checkingAccount)
        .mockResolvedValueOnce(savingsAccount);

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(transferMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'Insufficient balance in Checking. Available: $100.00'
      );
    });

    it('should handle account not found', async () => {
      mockPrisma.account.findFirst
        .mockResolvedValueOnce(null) // From account not found
        .mockResolvedValueOnce(null); // To account not found

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(transferMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'Account not found. Please check account names.'
      );
    });
  });

  describe('handleBalanceQuery', () => {
    const balanceMessage: ParsedMessage = {
      intent: 'balance_query',
      entities: {},
      confidence: 0.9,
      originalMessage: 'balance',
    };

    it('should return account balances', async () => {
      const accounts = [
        {
          id: 'account-1',
          name: 'Checking',
          balance: { toNumber: () => 1000 },
          type: 'CHECKING',
        },
        {
          id: 'account-2',
          name: 'Savings',
          balance: { toNumber: () => 5000 },
          type: 'SAVINGS',
        },
      ];

      mockPrisma.account.findMany.mockResolvedValue(accounts);

      const mockSendBalanceInfo = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendBalanceInfo = mockSendBalanceInfo;

      await commandHandler.handleCommand(balanceMessage, '+1234567890', mockContext);

      expect(mockSendBalanceInfo).toHaveBeenCalledWith('+1234567890', [
        { account: 'Checking', balance: 1000, type: 'CHECKING' },
        { account: 'Savings', balance: 5000, type: 'SAVINGS' },
      ]);
    });

    it('should handle no accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(balanceMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'No accounts found. Please create an account first.'
      );
    });
  });

  describe('handleExpenseReport', () => {
    const reportMessage: ParsedMessage = {
      intent: 'expense_report',
      entities: {
        period: 'this_month',
      },
      confidence: 0.9,
      originalMessage: 'expenses this month',
    };

    it('should generate expense report', async () => {
      const expenses = [
        {
          categoryId: 'category-1',
          _sum: { amount: { toNumber: () => 200 } },
          _count: 5,
        },
        {
          categoryId: 'category-2',
          _sum: { amount: { toNumber: () => 150 } },
          _count: 3,
        },
      ];

      const categories = [
        { id: 'category-1', name: 'Food' },
        { id: 'category-2', name: 'Transportation' },
      ];

      mockPrisma.transaction.groupBy.mockResolvedValue(expenses);
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const mockSendSpendingReport = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendSpendingReport = mockSendSpendingReport;

      await commandHandler.handleCommand(reportMessage, '+1234567890', mockContext);

      expect(mockSendSpendingReport).toHaveBeenCalledWith('+1234567890', {
        period: 'This Month',
        expenses: [
          { category: 'Food', amount: 200 },
          { category: 'Transportation', amount: 150 },
        ],
        total: 350,
      });
    });

    it('should handle no expenses', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([]);

      const mockSendMessage = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendMessage = mockSendMessage;

      await commandHandler.handleCommand(reportMessage, '+1234567890', mockContext);

      expect(mockSendMessage).toHaveBeenCalledWith({
        to: '+1234567890',
        body: '📊 No expenses found for This Month.',
      });
    });
  });

  describe('handleHelp', () => {
    const helpMessage: ParsedMessage = {
      intent: 'help',
      entities: {},
      confidence: 0.9,
      originalMessage: 'help',
    };

    it('should send help message', async () => {
      const mockSendHelp = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendHelp = mockSendHelp;

      await commandHandler.handleCommand(helpMessage, '+1234567890', mockContext);

      expect(mockSendHelp).toHaveBeenCalledWith('+1234567890');
    });
  });

  describe('handleUnknownCommand', () => {
    const unknownMessage: ParsedMessage = {
      intent: 'unknown',
      entities: {},
      confidence: 0.2,
      originalMessage: 'random text',
    };

    it('should send error message for unknown command', async () => {
      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(unknownMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining("I didn't understand that command")
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const expenseMessage: ParsedMessage = {
        intent: 'add_expense',
        entities: { amount: 50 },
        confidence: 0.9,
        originalMessage: 'add expense 50',
      };

      mockPrisma.account.findFirst.mockRejectedValue(new Error('Database error'));

      const mockSendError = jest.fn();
      require('../../services/whatsapp/client').whatsAppClient.sendError = mockSendError;

      await commandHandler.handleCommand(expenseMessage, '+1234567890', mockContext);

      expect(mockSendError).toHaveBeenCalledWith(
        '+1234567890',
        'Sorry, there was an error processing your request.'
      );
    });
  });
});