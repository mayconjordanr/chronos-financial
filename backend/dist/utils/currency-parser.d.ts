export interface ParsedAmount {
    amount: number;
    currency: string;
    rawInput: string;
    confidence: number;
}
export interface CurrencyFormatOptions {
    currency?: string;
    locale?: string;
    symbol?: boolean;
    precision?: number;
}
export declare class CurrencyParser {
    private static readonly DEFAULT_CURRENCY;
    private static readonly CURRENCY_SYMBOLS;
    private static readonly CURRENCY_PATTERNS;
    static parseAmount(text: string, defaultCurrency?: string): ParsedAmount | null;
    static parseMultipleAmounts(text: string, defaultCurrency?: string): ParsedAmount[];
    static formatAmount(amount: number, options?: CurrencyFormatOptions): string;
    static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number>;
    static isValidCurrency(currencyCode: string): boolean;
    static getCurrencySymbol(currencyCode: string): string;
    static detectCurrencyFromSymbol(symbol: string): string | null;
    static normalizeAmountString(amountStr: string): string;
    static isValidAmount(amount: any): boolean;
    static extractAmountsWithContext(text: string): Array<{
        amount: ParsedAmount;
        context: string;
        position: number;
    }>;
    static smartParseFinancialAmount(text: string): ParsedAmount | null;
}
//# sourceMappingURL=currency-parser.d.ts.map