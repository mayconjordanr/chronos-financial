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
export declare class WhatsAppClient {
    private client;
    private phoneNumber;
    private isEnabled;
    constructor(config: WhatsAppConfig);
    isServiceEnabled(): boolean;
    sendMessage(options: SendMessageOptions): Promise<SendMessageResponse>;
    sendFinancialReport(to: string, report: string): Promise<SendMessageResponse>;
    sendTransactionConfirmation(to: string, transaction: {
        amount: number;
        type: string;
        category?: string;
        account: string;
        balance: number;
    }): Promise<SendMessageResponse>;
    sendBalanceInfo(to: string, balances: Array<{
        account: string;
        balance: number;
        type: string;
    }>): Promise<SendMessageResponse>;
    sendSpendingReport(to: string, report: {
        period: string;
        expenses: Array<{
            category: string;
            amount: number;
        }>;
        total: number;
    }): Promise<SendMessageResponse>;
    sendBudgetStatus(to: string, budgets: Array<{
        name: string;
        spent: number;
        limit: number;
        percentage: number;
    }>): Promise<SendMessageResponse>;
    sendError(to: string, error: string): Promise<SendMessageResponse>;
    sendHelp(to: string): Promise<SendMessageResponse>;
    static verifyWebhook(signature: string, url: string, body: string, authToken: string): boolean;
    private getAccountEmoji;
    private getCategoryEmoji;
}
export declare const whatsAppClient: WhatsAppClient;
//# sourceMappingURL=client.d.ts.map