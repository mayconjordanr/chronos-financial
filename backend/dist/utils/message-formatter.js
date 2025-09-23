"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFormatter = void 0;
class MessageFormatter {
    static EMOJIS = {
        money: '💰',
        expense: '💸',
        income: '💵',
        transfer: '🔄',
        balance: '💳',
        total: '📊',
        checking: '🏦',
        savings: '💰',
        credit_card: '💳',
        investment: '📈',
        loan: '🏠',
        cash: '💵',
        food: '🍕',
        transport: '⛽',
        shopping: '🛍️',
        entertainment: '🎬',
        bills: '🏠',
        health: '⚕️',
        education: '📚',
        travel: '✈️',
        coffee: '☕',
        grocery: '🛒',
        salary: '💼',
        bonus: '🎁',
        freelance: '💻',
        investment_income: '📈',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        help: '💡',
        good: '🟢',
        warning_budget: '🟡',
        danger: '🔴',
        calendar: '📅',
        clock: '🕐',
        add: '➕',
        subtract: '➖',
        edit: '✏️',
        delete: '🗑️',
    };
    static formatTransactionConfirmation(transaction, options = {}) {
        const { includeEmojis = true } = options;
        const emoji = includeEmojis ?
            (transaction.type === 'INCOME' ? this.EMOJIS.income : this.EMOJIS.expense) : '';
        const typeText = transaction.type === 'INCOME' ? 'income' : 'expense';
        const actionEmoji = includeEmojis ? this.EMOJIS.success : '';
        let message = `${emoji} ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} recorded!\n\n`;
        message += `${includeEmojis ? this.EMOJIS.money : ''}Amount: ${this.formatCurrency(transaction.amount, options)}\n`;
        if (transaction.category) {
            const categoryEmoji = includeEmojis ? this.getCategoryEmoji(transaction.category) : '';
            message += `${categoryEmoji}Category: ${transaction.category}\n`;
        }
        const accountEmoji = includeEmojis ? this.EMOJIS.checking : '';
        message += `${accountEmoji}Account: ${transaction.account}\n`;
        const balanceEmoji = includeEmojis ? this.EMOJIS.balance : '';
        message += `${balanceEmoji}New Balance: ${this.formatCurrency(transaction.balance, options)}\n\n`;
        message += `${actionEmoji}Transaction saved successfully!`;
        return this.truncateMessage(message, options.maxLength);
    }
    static formatBalanceInfo(balances, options = {}) {
        const { includeEmojis = true } = options;
        let message = `${includeEmojis ? this.EMOJIS.money : ''}Your Account Balances:\n\n`;
        let totalBalance = 0;
        for (const account of balances) {
            const emoji = includeEmojis ? this.getAccountEmoji(account.type) : '';
            message += `${emoji}${account.account}: ${this.formatCurrency(account.balance, options)}\n`;
            totalBalance += account.balance;
        }
        const totalEmoji = includeEmojis ? this.EMOJIS.total : '';
        message += `\n${totalEmoji}Total: ${this.formatCurrency(totalBalance, options)}`;
        return this.truncateMessage(message, options.maxLength);
    }
    static formatSpendingReport(report, options = {}) {
        const { includeEmojis = true } = options;
        const reportEmoji = includeEmojis ? this.EMOJIS.total : '';
        let message = `${reportEmoji}${report.period} Expenses:\n\n`;
        for (const expense of report.expenses) {
            const emoji = includeEmojis ? this.getCategoryEmoji(expense.category) : '';
            message += `${emoji}${expense.category}: ${this.formatCurrency(expense.amount, options)}\n`;
        }
        const totalEmoji = includeEmojis ? this.EMOJIS.money : '';
        message += `\n${totalEmoji}Total: ${this.formatCurrency(report.total, options)}`;
        if (report.budget) {
            const remaining = report.budget - report.total;
            const percentage = (report.total / report.budget) * 100;
            const statusEmoji = includeEmojis ?
                (percentage > 100 ? this.EMOJIS.danger :
                    percentage > 80 ? this.EMOJIS.warning_budget : this.EMOJIS.good) : '';
            message += `\n${statusEmoji}Budget: ${this.formatCurrency(report.budget, options)}`;
            message += `\nRemaining: ${this.formatCurrency(remaining, options)} (${percentage.toFixed(1)}%)`;
        }
        return this.truncateMessage(message, options.maxLength);
    }
    static formatBudgetStatus(budgets, options = {}) {
        const { includeEmojis = true } = options;
        const budgetEmoji = includeEmojis ? this.EMOJIS.total : '';
        let message = `${budgetEmoji}Budget Status:\n\n`;
        for (const budget of budgets) {
            const statusEmoji = includeEmojis ?
                (budget.percentage > 90 ? this.EMOJIS.danger :
                    budget.percentage > 70 ? this.EMOJIS.warning_budget : this.EMOJIS.good) : '';
            message += `${statusEmoji}${budget.name}: ${this.formatCurrency(budget.spent, options)} / ${this.formatCurrency(budget.limit, options)} (${budget.percentage.toFixed(1)}%)\n`;
            if (budget.daysLeft) {
                message += `  Days left: ${budget.daysLeft}\n`;
            }
        }
        return this.truncateMessage(message, options.maxLength);
    }
    static formatTransferConfirmation(amount, fromAccount, toAccount, fromBalance, toBalance, options = {}) {
        const { includeEmojis = true } = options;
        const transferEmoji = includeEmojis ? this.EMOJIS.transfer : '';
        const successEmoji = includeEmojis ? this.EMOJIS.success : '';
        let message = `${transferEmoji}Transfer completed!\n\n`;
        message += `From: ${fromAccount} - ${this.formatCurrency(amount, options)}\n`;
        message += `To: ${toAccount} + ${this.formatCurrency(amount, options)}\n\n`;
        const balanceEmoji = includeEmojis ? this.EMOJIS.balance : '';
        message += `${balanceEmoji}${fromAccount}: ${this.formatCurrency(fromBalance, options)}\n`;
        message += `${balanceEmoji}${toAccount}: ${this.formatCurrency(toBalance, options)}\n\n`;
        message += `${successEmoji}Transfer successful!`;
        return this.truncateMessage(message, options.maxLength);
    }
    static formatError(error, suggestion, options = {}) {
        const { includeEmojis = true } = options;
        const errorEmoji = includeEmojis ? this.EMOJIS.error : '';
        let message = `${errorEmoji}Error: ${error}`;
        if (suggestion) {
            const helpEmoji = includeEmojis ? this.EMOJIS.help : '';
            message += `\n\n${helpEmoji}${suggestion}`;
        }
        message += '\n\nNeed help? Send "help" for available commands.';
        return this.truncateMessage(message, options.maxLength);
    }
    static formatHelp(options = {}) {
        const { includeEmojis = true } = options;
        const helpEmoji = includeEmojis ? this.EMOJIS.help : '';
        let message = `${helpEmoji}CHRONOS WhatsApp Commands:\n\n`;
        const expenseEmoji = includeEmojis ? this.EMOJIS.expense : '';
        message += `${expenseEmoji}EXPENSES:\n`;
        message += '• "add expense 50 food" - Add $50 food expense\n';
        message += '• "spent 25 on gas" - Add gas expense\n';
        message += '• "bought coffee for 5" - Add coffee expense\n\n';
        const incomeEmoji = includeEmojis ? this.EMOJIS.income : '';
        message += `${incomeEmoji}INCOME:\n`;
        message += '• "income 5000 salary" - Add salary income\n';
        message += '• "received 100 from freelance" - Add income\n';
        message += '• "got paid 3000" - Add payment\n\n';
        const transferEmoji = includeEmojis ? this.EMOJIS.transfer : '';
        message += `${transferEmoji}TRANSFERS:\n`;
        message += '• "transfer 200 from checking to savings"\n';
        message += '• "move 50 to emergency fund"\n\n';
        const reportEmoji = includeEmojis ? this.EMOJIS.total : '';
        message += `${reportEmoji}REPORTS:\n`;
        message += '• "balance" - Show account balances\n';
        message += '• "expenses this month" - Monthly spending\n';
        message += '• "budget status" - Budget overview\n';
        message += '• "income this month" - Monthly income\n\n';
        const questionEmoji = includeEmojis ? '❓' : '';
        message += `${questionEmoji}Type "help" anytime for this menu.`;
        return this.truncateMessage(message, options.maxLength);
    }
    static formatIncomeReport(period, incomes, total, options = {}) {
        const { includeEmojis = true } = options;
        const incomeEmoji = includeEmojis ? this.EMOJIS.income : '';
        let message = `${incomeEmoji}${period} Income:\n\n`;
        for (const income of incomes) {
            const categoryEmoji = includeEmojis ? this.getCategoryEmoji(income.category) : '';
            message += `${categoryEmoji}${income.category}: ${this.formatCurrency(income.amount, options)}\n`;
        }
        const totalEmoji = includeEmojis ? this.EMOJIS.total : '';
        message += `\n${totalEmoji}Total: ${this.formatCurrency(total, options)}`;
        return this.truncateMessage(message, options.maxLength);
    }
    static formatWelcome(options = {}) {
        const { includeEmojis = true } = options;
        const welcomeEmoji = includeEmojis ? '👋' : '';
        const successEmoji = includeEmojis ? this.EMOJIS.success : '';
        let message = `${welcomeEmoji}Welcome to CHRONOS Financial!\n\n`;
        message += `${successEmoji}WhatsApp integration activated!\n\n`;
        message += 'You can now manage your finances with simple messages:\n\n';
        const expenseEmoji = includeEmojis ? this.EMOJIS.expense : '';
        message += `${expenseEmoji}Add expenses: "add expense 50 food"\n`;
        const incomeEmoji = includeEmojis ? this.EMOJIS.income : '';
        message += `${incomeEmoji}Add income: "income 5000 salary"\n`;
        const balanceEmoji = includeEmojis ? this.EMOJIS.balance : '';
        message += `${balanceEmoji}Check balance: "balance"\n`;
        const reportEmoji = includeEmojis ? this.EMOJIS.total : '';
        message += `${reportEmoji}View reports: "expenses this month"\n\n`;
        message += 'Type "help" anytime for all commands.';
        return this.truncateMessage(message, options.maxLength);
    }
    static formatCurrency(amount, options = {}) {
        const { currency = 'USD', locale = 'en-US' } = options;
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
        }
        catch (error) {
            return `$${amount.toFixed(2)}`;
        }
    }
    static getAccountEmoji(type) {
        const typeMap = {
            CHECKING: this.EMOJIS.checking,
            SAVINGS: this.EMOJIS.savings,
            CREDIT_CARD: this.EMOJIS.credit_card,
            INVESTMENT: this.EMOJIS.investment,
            LOAN: this.EMOJIS.loan,
            CASH: this.EMOJIS.cash,
        };
        return typeMap[type] || this.EMOJIS.checking;
    }
    static getCategoryEmoji(category) {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('food') || categoryLower.includes('restaurant'))
            return this.EMOJIS.food;
        if (categoryLower.includes('transport') || categoryLower.includes('gas'))
            return this.EMOJIS.transport;
        if (categoryLower.includes('shopping') || categoryLower.includes('clothes'))
            return this.EMOJIS.shopping;
        if (categoryLower.includes('entertainment') || categoryLower.includes('movie'))
            return this.EMOJIS.entertainment;
        if (categoryLower.includes('bills') || categoryLower.includes('utilities'))
            return this.EMOJIS.bills;
        if (categoryLower.includes('health') || categoryLower.includes('medical'))
            return this.EMOJIS.health;
        if (categoryLower.includes('education') || categoryLower.includes('books'))
            return this.EMOJIS.education;
        if (categoryLower.includes('travel') || categoryLower.includes('vacation'))
            return this.EMOJIS.travel;
        if (categoryLower.includes('coffee') || categoryLower.includes('cafe'))
            return this.EMOJIS.coffee;
        if (categoryLower.includes('grocery') || categoryLower.includes('supermarket'))
            return this.EMOJIS.grocery;
        if (categoryLower.includes('salary') || categoryLower.includes('wage'))
            return this.EMOJIS.salary;
        if (categoryLower.includes('bonus'))
            return this.EMOJIS.bonus;
        if (categoryLower.includes('freelance'))
            return this.EMOJIS.freelance;
        if (categoryLower.includes('investment'))
            return this.EMOJIS.investment_income;
        return '📂';
    }
    static truncateMessage(message, maxLength) {
        if (!maxLength || message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + '...';
    }
    static formatConfirmationRequest(action, details, options = {}) {
        const { includeEmojis = true } = options;
        const warningEmoji = includeEmojis ? this.EMOJIS.warning : '';
        let message = `${warningEmoji}Confirmation required:\n\n`;
        message += `${action}\n\n`;
        message += `${details}\n\n`;
        message += 'Reply with "confirm" to proceed or "cancel" to abort.';
        return this.truncateMessage(message, options.maxLength);
    }
    static formatTransactionList(transactions, options = {}) {
        const { includeEmojis = true } = options;
        const listEmoji = includeEmojis ? '📋' : '';
        let message = `${listEmoji}Recent Transactions:\n\n`;
        for (const transaction of transactions.slice(0, 10)) {
            const typeEmoji = includeEmojis ?
                (transaction.type === 'INCOME' ? this.EMOJIS.income : this.EMOJIS.expense) : '';
            const dateStr = transaction.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            message += `${typeEmoji}${this.formatCurrency(transaction.amount, options)} - ${transaction.description} (${dateStr})\n`;
        }
        return this.truncateMessage(message, options.maxLength);
    }
}
exports.MessageFormatter = MessageFormatter;
//# sourceMappingURL=message-formatter.js.map