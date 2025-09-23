import { ParsedMessage } from './parser';
import { WebhookContext } from './webhook';
export declare class CommandHandler {
    handleCommand(parseResult: ParsedMessage, phoneNumber: string, context: WebhookContext): Promise<void>;
    private handleAddExpense;
    private handleAddIncome;
    private handleTransfer;
    private handleBalanceQuery;
    private handleExpenseReport;
    private handleIncomeReport;
    private handleBudgetStatus;
    private handleVerification;
    private handleUnknownCommand;
    private getDefaultAccount;
    private findAccountByName;
    private getOrCreateCategory;
    private getDateRange;
    private formatPeriod;
}
//# sourceMappingURL=commands.d.ts.map