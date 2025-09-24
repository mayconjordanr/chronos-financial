"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppClient = exports.WhatsAppClient = void 0;
const twilio_1 = require("twilio");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class WhatsAppClient {
    client;
    phoneNumber;
    isEnabled;
    constructor(config) {
        this.phoneNumber = config.phoneNumber;
        if (config.accountSid && config.authToken && config.phoneNumber) {
            try {
                this.client = new twilio_1.Twilio(config.accountSid, config.authToken);
                this.isEnabled = true;
            }
            catch (error) {
                console.warn('⚠️ Failed to initialize Twilio client:', error);
                this.client = null;
                this.isEnabled = false;
            }
        }
        else {
            this.client = null;
            this.isEnabled = false;
        }
    }
    isServiceEnabled() {
        return this.isEnabled && this.client !== null;
    }
    async sendMessage(options) {
        if (!this.isServiceEnabled()) {
            return {
                sid: '',
                status: 'failed',
                errorCode: 'SERVICE_DISABLED',
                errorMessage: 'WhatsApp integration is not configured or disabled',
            };
        }
        try {
            const message = await this.client.messages.create({
                from: `whatsapp:${this.phoneNumber}`,
                to: `whatsapp:${options.to}`,
                body: options.body,
                mediaUrl: options.mediaUrl,
            });
            return {
                sid: message.sid,
                status: message.status,
            };
        }
        catch (error) {
            return {
                sid: '',
                status: 'failed',
                errorCode: error.code || 'UNKNOWN_ERROR',
                errorMessage: error.message || 'Failed to send message',
            };
        }
    }
    async sendFinancialReport(to, report) {
        return this.sendMessage({
            to,
            body: report,
        });
    }
    async sendTransactionConfirmation(to, transaction) {
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
    async sendBalanceInfo(to, balances) {
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
    async sendSpendingReport(to, report) {
        let message = `📊 ${report.period} Expenses:\n\n`;
        for (const expense of report.expenses) {
            const emoji = this.getCategoryEmoji(expense.category);
            message += `${emoji} ${expense.category}: $${expense.amount.toFixed(2)}\n`;
        }
        message += `\n💰 Total: $${report.total.toFixed(2)}`;
        return this.sendMessage({ to, body: message });
    }
    async sendBudgetStatus(to, budgets) {
        let message = '📊 Budget Status:\n\n';
        for (const budget of budgets) {
            const emoji = budget.percentage > 90 ? '🔴' : budget.percentage > 70 ? '🟡' : '🟢';
            message += `${emoji} ${budget.name}: $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(2)} (${budget.percentage.toFixed(1)}%)\n`;
        }
        return this.sendMessage({ to, body: message });
    }
    async sendError(to, error) {
        const message = `❌ Error: ${error}\n\nNeed help? Send "help" for available commands.`;
        return this.sendMessage({ to, body: message });
    }
    async sendHelp(to) {
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
    static verifyWebhook(signature, url, body, authToken) {
        try {
            if (!authToken) {
                console.warn('⚠️ No auth token provided for webhook verification');
                return false;
            }
            return twilio_1.Twilio.validateRequest(authToken, signature, url, body);
        }
        catch (error) {
            console.warn('⚠️ Webhook verification failed:', error);
            return false;
        }
    }
    getAccountEmoji(type) {
        const emojiMap = {
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
    getCategoryEmoji(category) {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('food') || categoryLower.includes('restaurant'))
            return '🍕';
        if (categoryLower.includes('transport') || categoryLower.includes('gas'))
            return '⛽';
        if (categoryLower.includes('shopping') || categoryLower.includes('clothes'))
            return '🛍️';
        if (categoryLower.includes('entertainment') || categoryLower.includes('movie'))
            return '🎬';
        if (categoryLower.includes('bills') || categoryLower.includes('utilities'))
            return '🏠';
        if (categoryLower.includes('health') || categoryLower.includes('medical'))
            return '⚕️';
        if (categoryLower.includes('education') || categoryLower.includes('books'))
            return '📚';
        if (categoryLower.includes('travel') || categoryLower.includes('vacation'))
            return '✈️';
        if (categoryLower.includes('coffee') || categoryLower.includes('cafe'))
            return '☕';
        if (categoryLower.includes('grocery') || categoryLower.includes('supermarket'))
            return '🛒';
        return '📂';
    }
}
exports.WhatsAppClient = WhatsAppClient;
exports.whatsAppClient = new WhatsAppClient({
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
});
//# sourceMappingURL=client.js.map