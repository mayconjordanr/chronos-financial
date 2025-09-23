export interface ParsedMessage {
    intent: string;
    entities: {
        amount?: number;
        category?: string;
        description?: string;
        date?: Date;
        accountFrom?: string;
        accountTo?: string;
        period?: string;
        confirmationNeeded?: boolean;
    };
    confidence: number;
    originalMessage: string;
}
export interface OpenAIResponse {
    intent: string;
    entities: {
        amount?: number;
        category?: string;
        description?: string;
        date?: string;
        accountFrom?: string;
        accountTo?: string;
        period?: string;
    };
    confidence: number;
}
export declare class MessageParser {
    private openai;
    constructor();
    parseMessage(message: string): Promise<ParsedMessage>;
    private isBasicCommand;
    private parseBasicCommand;
    private parseWithAI;
    private processAIResult;
    private parseWithRules;
    private extractAmount;
    private hasExpenseKeywords;
    private hasIncomeKeywords;
    private hasTransferKeywords;
    private extractCategory;
    private extractIncomeCategory;
    private extractDescription;
    private extractAccounts;
    private extractPeriod;
}
//# sourceMappingURL=parser.d.ts.map