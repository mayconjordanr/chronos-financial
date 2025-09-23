import { PrismaClient } from '@prisma/client';
import { whatsAppClient } from './client';
import { ParsedMessage } from './parser';
import { WebhookContext } from './webhook';

const prisma = new PrismaClient();

export class CommandHandler {
  /**
   * Handle parsed command
   */
  async handleCommand(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    try {
      switch (parseResult.intent) {
        case 'add_expense':
          await this.handleAddExpense(parseResult, phoneNumber, context);
          break;

        case 'add_income':
          await this.handleAddIncome(parseResult, phoneNumber, context);
          break;

        case 'transfer':
          await this.handleTransfer(parseResult, phoneNumber, context);
          break;

        case 'balance_query':
          await this.handleBalanceQuery(parseResult, phoneNumber, context);
          break;

        case 'expense_report':
          await this.handleExpenseReport(parseResult, phoneNumber, context);
          break;

        case 'income_report':
          await this.handleIncomeReport(parseResult, phoneNumber, context);
          break;

        case 'budget_status':
          await this.handleBudgetStatus(parseResult, phoneNumber, context);
          break;

        case 'help':
          await whatsAppClient.sendHelp(phoneNumber);
          break;

        case 'verify':
          await this.handleVerification(parseResult, phoneNumber, context);
          break;

        default:
          await this.handleUnknownCommand(parseResult, phoneNumber);
          break;
      }
    } catch (error) {
      console.error('Command handling error:', error);
      await whatsAppClient.sendError(phoneNumber, 'Sorry, there was an error processing your request.');
    }
  }

  /**
   * Handle add expense command
   */
  private async handleAddExpense(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    const { amount, category, description, date, confirmationNeeded } = parseResult.entities;

    if (!amount) {
      await whatsAppClient.sendError(phoneNumber, 'Please specify an amount. Example: "add expense 50 food"');
      return;
    }

    // Get default account
    const defaultAccount = await this.getDefaultAccount(context.tenantId, context.userId!);
    if (!defaultAccount) {
      await whatsAppClient.sendError(phoneNumber, 'No accounts found. Please create an account first.');
      return;
    }

    // Get or create category
    const categoryRecord = category ? await this.getOrCreateCategory(context.tenantId, category) : null;

    // Check for large amount confirmation
    if (confirmationNeeded) {
      // TODO: Implement confirmation flow
      const confirmMessage = `⚠️ Large expense detected: $${amount.toFixed(2)}

Reply with "confirm" to proceed or "cancel" to abort.`;
      await whatsAppClient.sendMessage({ to: phoneNumber, body: confirmMessage });
      return;
    }

    try {
      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId!,
          accountId: defaultAccount.id,
          categoryId: categoryRecord?.id,
          amount: amount,
          type: 'EXPENSE',
          description: description || 'WhatsApp expense',
          date: date || new Date(),
          status: 'COMPLETED',
        },
      });

      // Update account balance
      const newBalance = defaultAccount.balance.toNumber() - amount;
      await prisma.account.update({
        where: { id: defaultAccount.id },
        data: { balance: newBalance },
      });

      // Log balance change
      await prisma.balanceHistory.create({
        data: {
          tenantId: context.tenantId,
          accountId: defaultAccount.id,
          previousBalance: defaultAccount.balance,
          newBalance: newBalance,
          change: -amount,
          description: `Expense: ${description || 'WhatsApp expense'}`,
        },
      });

      // Send confirmation
      await whatsAppClient.sendTransactionConfirmation(phoneNumber, {
        amount,
        type: 'EXPENSE',
        category: categoryRecord?.name,
        account: defaultAccount.name,
        balance: newBalance,
      });

    } catch (error) {
      console.error('Error creating expense:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to create expense. Please try again.');
    }
  }

  /**
   * Handle add income command
   */
  private async handleAddIncome(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    const { amount, category, description, date } = parseResult.entities;

    if (!amount) {
      await whatsAppClient.sendError(phoneNumber, 'Please specify an amount. Example: "income 5000 salary"');
      return;
    }

    // Get default account
    const defaultAccount = await this.getDefaultAccount(context.tenantId, context.userId!);
    if (!defaultAccount) {
      await whatsAppClient.sendError(phoneNumber, 'No accounts found. Please create an account first.');
      return;
    }

    // Get or create category
    const categoryRecord = category ? await this.getOrCreateCategory(context.tenantId, category) : null;

    try {
      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId!,
          accountId: defaultAccount.id,
          categoryId: categoryRecord?.id,
          amount: amount,
          type: 'INCOME',
          description: description || 'WhatsApp income',
          date: date || new Date(),
          status: 'COMPLETED',
        },
      });

      // Update account balance
      const newBalance = defaultAccount.balance.toNumber() + amount;
      await prisma.account.update({
        where: { id: defaultAccount.id },
        data: { balance: newBalance },
      });

      // Log balance change
      await prisma.balanceHistory.create({
        data: {
          tenantId: context.tenantId,
          accountId: defaultAccount.id,
          previousBalance: defaultAccount.balance,
          newBalance: newBalance,
          change: amount,
          description: `Income: ${description || 'WhatsApp income'}`,
        },
      });

      // Send confirmation
      await whatsAppClient.sendTransactionConfirmation(phoneNumber, {
        amount,
        type: 'INCOME',
        category: categoryRecord?.name,
        account: defaultAccount.name,
        balance: newBalance,
      });

    } catch (error) {
      console.error('Error creating income:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to create income. Please try again.');
    }
  }

  /**
   * Handle transfer command
   */
  private async handleTransfer(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    const { amount, accountFrom, accountTo } = parseResult.entities;

    if (!amount || !accountFrom || !accountTo) {
      await whatsAppClient.sendError(phoneNumber, 'Please specify amount and accounts. Example: "transfer 200 from checking to savings"');
      return;
    }

    try {
      // Find accounts
      const fromAccount = await this.findAccountByName(context.tenantId, context.userId!, accountFrom);
      const toAccount = await this.findAccountByName(context.tenantId, context.userId!, accountTo);

      if (!fromAccount || !toAccount) {
        await whatsAppClient.sendError(phoneNumber, 'Account not found. Please check account names.');
        return;
      }

      // Check sufficient balance
      if (fromAccount.balance.toNumber() < amount) {
        await whatsAppClient.sendError(phoneNumber, `Insufficient balance in ${fromAccount.name}. Available: $${fromAccount.balance.toNumber().toFixed(2)}`);
        return;
      }

      // Create transfer transactions
      await prisma.$transaction(async (tx) => {
        // Debit from source account
        await tx.transaction.create({
          data: {
            tenantId: context.tenantId,
            userId: context.userId!,
            accountId: fromAccount.id,
            amount: amount,
            type: 'TRANSFER',
            description: `Transfer to ${toAccount.name}`,
            date: new Date(),
            status: 'COMPLETED',
          },
        });

        // Credit to destination account
        await tx.transaction.create({
          data: {
            tenantId: context.tenantId,
            userId: context.userId!,
            accountId: toAccount.id,
            amount: amount,
            type: 'TRANSFER',
            description: `Transfer from ${fromAccount.name}`,
            date: new Date(),
            status: 'COMPLETED',
          },
        });

        // Update account balances
        const newFromBalance = fromAccount.balance.toNumber() - amount;
        const newToBalance = toAccount.balance.toNumber() + amount;

        await tx.account.update({
          where: { id: fromAccount.id },
          data: { balance: newFromBalance },
        });

        await tx.account.update({
          where: { id: toAccount.id },
          data: { balance: newToBalance },
        });

        // Log balance changes
        await tx.balanceHistory.createMany({
          data: [
            {
              tenantId: context.tenantId,
              accountId: fromAccount.id,
              previousBalance: fromAccount.balance,
              newBalance: newFromBalance,
              change: -amount,
              description: `Transfer to ${toAccount.name}`,
            },
            {
              tenantId: context.tenantId,
              accountId: toAccount.id,
              previousBalance: toAccount.balance,
              newBalance: newToBalance,
              change: amount,
              description: `Transfer from ${fromAccount.name}`,
            },
          ],
        });
      });

      // Send confirmation
      const message = `💸 Transfer completed!

📤 From: ${fromAccount.name} - $${amount.toFixed(2)}
📥 To: ${toAccount.name} + $${amount.toFixed(2)}

💳 ${fromAccount.name}: $${(fromAccount.balance.toNumber() - amount).toFixed(2)}
💳 ${toAccount.name}: $${(toAccount.balance.toNumber() + amount).toFixed(2)}

✅ Transfer successful!`;

      await whatsAppClient.sendMessage({ to: phoneNumber, body: message });

    } catch (error) {
      console.error('Error processing transfer:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to process transfer. Please try again.');
    }
  }

  /**
   * Handle balance query
   */
  private async handleBalanceQuery(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    try {
      const accounts = await prisma.account.findMany({
        where: {
          tenantId: context.tenantId,
          userId: context.userId!,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (accounts.length === 0) {
        await whatsAppClient.sendError(phoneNumber, 'No accounts found. Please create an account first.');
        return;
      }

      const balances = accounts.map(account => ({
        account: account.name,
        balance: account.balance.toNumber(),
        type: account.type,
      }));

      await whatsAppClient.sendBalanceInfo(phoneNumber, balances);

    } catch (error) {
      console.error('Error fetching balances:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to fetch account balances.');
    }
  }

  /**
   * Handle expense report
   */
  private async handleExpenseReport(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    try {
      const period = parseResult.entities.period || 'this_month';
      const dateRange = this.getDateRange(period);

      const expenses = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          tenantId: context.tenantId,
          userId: context.userId!,
          type: 'EXPENSE',
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      if (expenses.length === 0) {
        await whatsAppClient.sendMessage({
          to: phoneNumber,
          body: `📊 No expenses found for ${this.formatPeriod(period)}.`
        });
        return;
      }

      // Get category names
      const categoryIds = expenses.map(e => e.categoryId).filter(id => id !== null);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });

      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const expenseData = expenses.map(expense => ({
        category: expense.categoryId ? categoryMap.get(expense.categoryId) || 'Other' : 'Uncategorized',
        amount: expense._sum.amount?.toNumber() || 0,
      }));

      const total = expenseData.reduce((sum, expense) => sum + expense.amount, 0);

      await whatsAppClient.sendSpendingReport(phoneNumber, {
        period: this.formatPeriod(period),
        expenses: expenseData,
        total,
      });

    } catch (error) {
      console.error('Error generating expense report:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to generate expense report.');
    }
  }

  /**
   * Handle income report
   */
  private async handleIncomeReport(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    try {
      const period = parseResult.entities.period || 'this_month';
      const dateRange = this.getDateRange(period);

      const incomes = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          tenantId: context.tenantId,
          userId: context.userId!,
          type: 'INCOME',
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: {
          amount: true,
        },
      });

      if (incomes.length === 0) {
        await whatsAppClient.sendMessage({
          to: phoneNumber,
          body: `💰 No income found for ${this.formatPeriod(period)}.`
        });
        return;
      }

      // Get category names
      const categoryIds = incomes.map(i => i.categoryId).filter(id => id !== null);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });

      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const incomeData = incomes.map(income => ({
        category: income.categoryId ? categoryMap.get(income.categoryId) || 'Other' : 'Uncategorized',
        amount: income._sum.amount?.toNumber() || 0,
      }));

      const total = incomeData.reduce((sum, income) => sum + income.amount, 0);

      let message = `💰 ${this.formatPeriod(period)} Income:\n\n`;

      for (const income of incomeData) {
        message += `💵 ${income.category}: $${income.amount.toFixed(2)}\n`;
      }

      message += `\n📊 Total: $${total.toFixed(2)}`;

      await whatsAppClient.sendMessage({ to: phoneNumber, body: message });

    } catch (error) {
      console.error('Error generating income report:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to generate income report.');
    }
  }

  /**
   * Handle budget status
   */
  private async handleBudgetStatus(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    try {
      const budgets = await prisma.budget.findMany({
        where: {
          tenantId: context.tenantId,
          userId: context.userId!,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          category: true,
        },
      });

      if (budgets.length === 0) {
        await whatsAppClient.sendMessage({
          to: phoneNumber,
          body: '📊 No active budgets found. Create budgets in the web app to track your spending!'
        });
        return;
      }

      const budgetData = budgets.map(budget => ({
        name: budget.name,
        spent: budget.spent.toNumber(),
        limit: budget.amount.toNumber(),
        percentage: (budget.spent.toNumber() / budget.amount.toNumber()) * 100,
      }));

      await whatsAppClient.sendBudgetStatus(phoneNumber, budgetData);

    } catch (error) {
      console.error('Error fetching budget status:', error);
      await whatsAppClient.sendError(phoneNumber, 'Failed to fetch budget status.');
    }
  }

  /**
   * Handle verification
   */
  private async handleVerification(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void> {
    // TODO: Implement verification code handling
    await whatsAppClient.sendMessage({
      to: phoneNumber,
      body: 'Verification feature coming soon!'
    });
  }

  /**
   * Handle unknown command
   */
  private async handleUnknownCommand(parseResult: ParsedMessage, phoneNumber: string): Promise<void> {
    let suggestion = '';

    if (parseResult.originalMessage.toLowerCase().includes('money') || parseResult.originalMessage.toLowerCase().includes('dollar')) {
      suggestion = '\n\nTry: "add expense 50 food" or "income 1000 salary"';
    }

    await whatsAppClient.sendError(phoneNumber, `I didn't understand that command.${suggestion}\n\nSend "help" for available commands.`);
  }

  /**
   * Get default account for user
   */
  private async getDefaultAccount(tenantId: string, userId: string) {
    return await prisma.account.findFirst({
      where: {
        tenantId,
        userId,
        isActive: true,
        type: 'CHECKING', // Prefer checking account
      },
    }) || await prisma.account.findFirst({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
    });
  }

  /**
   * Find account by name
   */
  private async findAccountByName(tenantId: string, userId: string, accountName: string) {
    return await prisma.account.findFirst({
      where: {
        tenantId,
        userId,
        name: {
          contains: accountName,
          mode: 'insensitive',
        },
        isActive: true,
      },
    });
  }

  /**
   * Get or create category
   */
  private async getOrCreateCategory(tenantId: string, categoryName: string) {
    // First try to find existing category
    let category = await prisma.category.findFirst({
      where: {
        tenantId,
        name: {
          equals: categoryName,
          mode: 'insensitive',
        },
      },
    });

    if (!category) {
      // Create new category
      category = await prisma.category.create({
        data: {
          tenantId,
          name: categoryName,
          description: `Auto-created from WhatsApp`,
          isSystem: false,
        },
      });
    }

    return category;
  }

  /**
   * Get date range for period
   */
  private getDateRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;

      case 'this_week':
        const startOfWeek = now.getDate() - now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        break;

      case 'last_week':
        const lastWeekStart = now.getDate() - now.getDay() - 7;
        start = new Date(now.getFullYear(), now.getMonth(), lastWeekStart);
        end = new Date(now.getFullYear(), now.getMonth(), lastWeekStart + 6, 23, 59, 59);
        break;

      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;

      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;

      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  /**
   * Format period for display
   */
  private formatPeriod(period: string): string {
    const periodMap: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'this_week': 'This Week',
      'last_week': 'Last Week',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'this_year': 'This Year',
    };

    return periodMap[period] || 'This Month';
  }
}