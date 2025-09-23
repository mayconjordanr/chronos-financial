export interface FormatOptions {
    currency?: string;
    locale?: string;
    includeEmojis?: boolean;
    maxLength?: number;
}
export interface BalanceInfo {
    account: string;
    balance: number;
    type: string;
}
export interface TransactionInfo {
    amount: number;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    category?: string;
    account: string;
    balance: number;
    date?: Date;
}
export interface SpendingReport {
    period: string;
    expenses: Array<{
        category: string;
        amount: number;
    }>;
    total: number;
    budget?: number;
}
export interface BudgetStatus {
    name: string;
    spent: number;
    limit: number;
    percentage: number;
    daysLeft?: number;
}
export declare class MessageFormatter {
    private static readonly EMOJIS;
    static formatTransactionConfirmation(transaction: TransactionInfo, options?: FormatOptions): string;
    static formatBalanceInfo(balances: BalanceInfo[], options?: FormatOptions): string;
    static formatSpendingReport(report: SpendingReport, options?: FormatOptions): string;
    static formatBudgetStatus(budgets: BudgetStatus[], options?: FormatOptions): string;
    static formatTransferConfirmation(amount: number, fromAccount: string, toAccount: string, fromBalance: number, toBalance: number, options?: FormatOptions): string;
    static formatError(error: string, suggestion?: string, options?: FormatOptions): string;
    static formatHelp(options?: FormatOptions): string;
    static formatIncomeReport(period: string, incomes: Array<{
        category: string;
        amount: number;
    }>, total: number, options?: FormatOptions): string;
    static formatWelcome(options?: FormatOptions): string;
    private static formatCurrency;
    private static getAccountEmoji;
    private static getCategoryEmoji;
    private static truncateMessage;
    static formatConfirmationRequest(action: string, details: string, options?: FormatOptions): string;
    static formatTransactionList(transactions: Array<{
        amount: number;
        type: string;
        description: string;
        date: Date;
        category?: string;
    }>, options?: FormatOptions): string;
}
//# sourceMappingURL=message-formatter.d.ts.map