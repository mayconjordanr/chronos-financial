import { Twilio } from 'twilio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SendMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string[];
}

export interface SendMessageResponse {
  sid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

export class WhatsAppClient {
  private client: Twilio | null;
  private phoneNumber: string;
  private isEnabled: boolean;

  constructor(config: WhatsAppConfig) {
    this.phoneNumber = config.phoneNumber;

    // Only initialize Twilio client if credentials are available
    if (config.accountSid && config.authToken && config.phoneNumber) {
      try {
        this.client = new Twilio(config.accountSid, config.authToken);
        this.isEnabled = true;
      } catch (error) {
        console.warn('⚠️ Failed to initialize Twilio client:', error);
        this.client = null;
        this.isEnabled = false;
      }
    } else {
      this.client = null;
      this.isEnabled = false;
    }
  }

  /**
   * Check if WhatsApp integration is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled && this.client !== null;
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResponse> {
    if (!this.isServiceEnabled()) {
      return {
        sid: '',
        status: 'failed',
        errorCode: 'SERVICE_DISABLED',
        errorMessage: 'WhatsApp integration is not configured or disabled',
      };
    }

    try {
      const message = await this.client!.messages.create({
        from: `whatsapp:${this.phoneNumber}`,
        to: `whatsapp:${options.to}`,
        body: options.body,
        mediaUrl: options.mediaUrl,
      });

      return {
        sid: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      return {
        sid: '',
        status: 'failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send a formatted financial report
   */
  async sendFinancialReport(to: string, report: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      body: report,
    });
  }

  /**
   * Send a transaction confirmation
   */
  async sendTransactionConfirmation(
    to: string,
    transaction: {
      amount: number;
      type: string;
      category?: string;
      account: string;
      balance: number;
    }
  ): Promise<SendMessageResponse> {
    const emoji = transaction.type === 'INCOME' ? '💰' : '💸';
    const typeText = transaction.type === 'INCOME' ? 'income' : 'expense';

    const message = `${emoji} ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} recorded!

💵 Amount: $${transaction.amount.toFixed(2)}
${transaction.category ? `📂 Category: ${transaction.category}` : ''}
🏦 Account: ${transaction.account}
💳 New Balance: $${transaction.balance.toFixed(2)}

✅ Transaction saved successfully!`;

    return this.sendMessage({ to, body: message });
  }

  /**
   * Send balance information
   */
  async sendBalanceInfo(
    to: string,
    balances: Array<{ account: string; balance: number; type: string }>
  ): Promise<SendMessageResponse> {
    let message = '💰 Your Account Balances:\n\n';

    let totalBalance = 0;
    for (const account of balances) {
      const emoji = this.getAccountEmoji(account.type);
      message += `${emoji} ${account.account}: $${account.balance.toFixed(2)}\n`;
      totalBalance += account.balance;
    }

    message += `\n📊 Total: $${totalBalance.toFixed(2)}`;

    return this.sendMessage({ to, body: message });
  }

  /**
   * Send spending report
   */
  async sendSpendingReport(
    to: string,
    report: {
      period: string;
      expenses: Array<{ category: string; amount: number }>;
      total: number;
    }
  ): Promise<SendMessageResponse> {
    let message = `📊 ${report.period} Expenses:\n\n`;

    for (const expense of report.expenses) {
      const emoji = this.getCategoryEmoji(expense.category);
      message += `${emoji} ${expense.category}: $${expense.amount.toFixed(2)}\n`;
    }

    message += `\n💰 Total: $${report.total.toFixed(2)}`;

    return this.sendMessage({ to, body: message });
  }

  /**
   * Send budget status
   */
  async sendBudgetStatus(
    to: string,
    budgets: Array<{
      name: string;
      spent: number;
      limit: number;
      percentage: number;
    }>
  ): Promise<SendMessageResponse> {
    let message = '📊 Budget Status:\n\n';

    for (const budget of budgets) {
      const emoji = budget.percentage > 90 ? '🔴' : budget.percentage > 70 ? '🟡' : '🟢';
      message += `${emoji} ${budget.name}: $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(2)} (${budget.percentage.toFixed(1)}%)\n`;
    }

    return this.sendMessage({ to, body: message });
  }

  /**
   * Send error message
   */
  async sendError(to: string, error: string): Promise<SendMessageResponse> {
    const message = `❌ Error: ${error}\n\nNeed help? Send "help" for available commands.`;
    return this.sendMessage({ to, body: message });
  }

  /**
   * Send help message
   */
  async sendHelp(to: string): Promise<SendMessageResponse> {
    const message = `💡 CHRONOS WhatsApp Commands:

💸 EXPENSES:
• "add expense 50 food" - Add $50 food expense
• "spent 25 on gas" - Add gas expense
• "bought coffee for 5" - Add coffee expense

💰 INCOME:
• "income 5000 salary" - Add salary income
• "received 100 from freelance" - Add income
• "got paid 3000" - Add payment

💳 TRANSFERS:
• "transfer 200 from checking to savings"
• "move 50 to emergency fund"

📊 REPORTS:
• "balance" - Show account balances
• "expenses this month" - Monthly spending
• "budget status" - Budget overview
• "income this month" - Monthly income

❓ Type "help" anytime for this menu.`;

    return this.sendMessage({ to, body: message });
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhook(signature: string, url: string, body: string, authToken: string): boolean {
    try {
      if (!authToken) {
        console.warn('⚠️ No auth token provided for webhook verification');
        return false;
      }
      return Twilio.validateRequest(authToken, signature, url, body);
    } catch (error) {
      console.warn('⚠️ Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Get account type emoji
   */
  private getAccountEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      CHECKING: '🏦',
      SAVINGS: '💰',
      CREDIT_CARD: '💳',
      INVESTMENT: '📈',
      LOAN: '🏠',
      CASH: '💵',
      OTHER: '📊',
    };
    return emojiMap[type] || '📊';
  }

  /**
   * Get category emoji
   */
  private getCategoryEmoji(category: string): string {
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('food') || categoryLower.includes('restaurant')) return '🍕';
    if (categoryLower.includes('transport') || categoryLower.includes('gas')) return '⛽';
    if (categoryLower.includes('shopping') || categoryLower.includes('clothes')) return '🛍️';
    if (categoryLower.includes('entertainment') || categoryLower.includes('movie')) return '🎬';
    if (categoryLower.includes('bills') || categoryLower.includes('utilities')) return '🏠';
    if (categoryLower.includes('health') || categoryLower.includes('medical')) return '⚕️';
    if (categoryLower.includes('education') || categoryLower.includes('books')) return '📚';
    if (categoryLower.includes('travel') || categoryLower.includes('vacation')) return '✈️';
    if (categoryLower.includes('coffee') || categoryLower.includes('cafe')) return '☕';
    if (categoryLower.includes('grocery') || categoryLower.includes('supermarket')) return '🛒';

    return '📂';
  }
}

// Export singleton instance
export const whatsAppClient = new WhatsAppClient({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
});