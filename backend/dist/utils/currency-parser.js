"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyParser = void 0;
const currency_js_1 = __importDefault(require("currency.js"));
class CurrencyParser {
    static DEFAULT_CURRENCY = 'USD';
    static CURRENCY_SYMBOLS = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₹': 'INR',
        '₽': 'RUB',
        '₡': 'CRC',
        '₩': 'KRW',
        '₨': 'PKR',
        '₪': 'ILS',
    };
    static CURRENCY_PATTERNS = [
        /\$(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
        /€(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
        /£(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:USD|usd|dollars?|bucks?)\b/gi,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:EUR|eur|euros?)\b/gi,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:GBP|gbp|pounds?)\b/gi,
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g,
    ];
    static parseAmount(text, defaultCurrency = this.DEFAULT_CURRENCY) {
        const cleanText = text.trim();
        for (let i = 0; i < this.CURRENCY_PATTERNS.length; i++) {
            const pattern = this.CURRENCY_PATTERNS[i];
            const matches = Array.from(cleanText.matchAll(pattern));
            if (matches.length > 0) {
                const match = matches[0];
                const amountStr = match[1];
                const numericAmount = parseFloat(amountStr.replace(/,/g, ''));
                if (isNaN(numericAmount) || numericAmount <= 0) {
                    continue;
                }
                let detectedCurrency = defaultCurrency;
                let confidence = 0.8;
                switch (i) {
                    case 0:
                        detectedCurrency = 'USD';
                        confidence = 0.95;
                        break;
                    case 1:
                        detectedCurrency = 'EUR';
                        confidence = 0.95;
                        break;
                    case 2:
                        detectedCurrency = 'GBP';
                        confidence = 0.95;
                        break;
                    case 3:
                        detectedCurrency = 'USD';
                        confidence = 0.9;
                        break;
                    case 4:
                        detectedCurrency = 'EUR';
                        confidence = 0.9;
                        break;
                    case 5:
                        detectedCurrency = 'GBP';
                        confidence = 0.9;
                        break;
                    case 6:
                        detectedCurrency = defaultCurrency;
                        confidence = 0.6;
                        break;
                }
                return {
                    amount: numericAmount,
                    currency: detectedCurrency,
                    rawInput: match[0],
                    confidence,
                };
            }
        }
        try {
            const parsed = (0, currency_js_1.default)(cleanText);
            if (parsed.value > 0) {
                return {
                    amount: parsed.value,
                    currency: defaultCurrency,
                    rawInput: cleanText,
                    confidence: 0.5,
                };
            }
        }
        catch (error) {
        }
        return null;
    }
    static parseMultipleAmounts(text, defaultCurrency = this.DEFAULT_CURRENCY) {
        const amounts = [];
        const cleanText = text.trim();
        for (const pattern of this.CURRENCY_PATTERNS) {
            const matches = Array.from(cleanText.matchAll(pattern));
            for (const match of matches) {
                const parsed = this.parseAmount(match[0], defaultCurrency);
                if (parsed && !amounts.some(a => Math.abs(a.amount - parsed.amount) < 0.01)) {
                    amounts.push(parsed);
                }
            }
        }
        return amounts.sort((a, b) => b.confidence - a.confidence);
    }
    static formatAmount(amount, options = {}) {
        const { currency: curr = this.DEFAULT_CURRENCY, locale = 'en-US', symbol = true, precision = 2, } = options;
        try {
            const formatted = new Intl.NumberFormat(locale, {
                style: symbol ? 'currency' : 'decimal',
                currency: curr,
                minimumFractionDigits: precision,
                maximumFractionDigits: precision,
            }).format(amount);
            return formatted;
        }
        catch (error) {
            const fixed = amount.toFixed(precision);
            return symbol ? `$${fixed}` : fixed;
        }
    }
    static async convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        console.warn('Currency conversion not implemented, returning original amount');
        return amount;
    }
    static isValidCurrency(currencyCode) {
        const validCurrencies = [
            'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
            'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'SEK', 'NOK',
            'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'ZAR', 'THB', 'MYR',
        ];
        return validCurrencies.includes(currencyCode.toUpperCase());
    }
    static getCurrencySymbol(currencyCode) {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥',
            CAD: 'C$',
            AUD: 'A$',
            CHF: 'Fr',
            CNY: '¥',
            INR: '₹',
            BRL: 'R$',
            MXN: '$',
            KRW: '₩',
            SGD: 'S$',
            HKD: 'HK$',
            SEK: 'kr',
            NOK: 'kr',
            DKK: 'kr',
            PLN: 'zł',
            CZK: 'Kč',
            HUF: 'Ft',
            ILS: '₪',
            ZAR: 'R',
            THB: '฿',
            MYR: 'RM',
        };
        return symbols[currencyCode.toUpperCase()] || currencyCode;
    }
    static detectCurrencyFromSymbol(symbol) {
        return this.CURRENCY_SYMBOLS[symbol] || null;
    }
    static normalizeAmountString(amountStr) {
        return amountStr
            .replace(/[^\d.-]/g, '')
            .replace(/,/g, '')
            .trim();
    }
    static isValidAmount(amount) {
        if (typeof amount === 'number') {
            return !isNaN(amount) && isFinite(amount) && amount >= 0;
        }
        if (typeof amount === 'string') {
            const parsed = parseFloat(this.normalizeAmountString(amount));
            return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
        }
        return false;
    }
    static extractAmountsWithContext(text) {
        const results = [];
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const parsed = this.parseAmount(word);
            if (parsed) {
                const contextStart = Math.max(0, i - 2);
                const contextEnd = Math.min(words.length, i + 3);
                const context = words.slice(contextStart, contextEnd).join(' ');
                results.push({
                    amount: parsed,
                    context,
                    position: i,
                });
            }
        }
        return results;
    }
    static smartParseFinancialAmount(text) {
        const lowerText = text.toLowerCase();
        const expenseKeywords = ['spent', 'paid', 'cost', 'expense', 'bill', 'bought'];
        const incomeKeywords = ['earned', 'received', 'income', 'salary', 'paid', 'bonus'];
        const hasExpenseContext = expenseKeywords.some(keyword => lowerText.includes(keyword));
        const hasIncomeContext = incomeKeywords.some(keyword => lowerText.includes(keyword));
        const parsed = this.parseAmount(text);
        if (parsed && (hasExpenseContext || hasIncomeContext)) {
            parsed.confidence = Math.min(parsed.confidence + 0.2, 1.0);
        }
        return parsed;
    }
}
exports.CurrencyParser = CurrencyParser;
//# sourceMappingURL=currency-parser.js.map