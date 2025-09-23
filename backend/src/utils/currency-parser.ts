import currency from 'currency.js';

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

export class CurrencyParser {
  private static readonly DEFAULT_CURRENCY = 'USD';
  private static readonly CURRENCY_SYMBOLS: Record<string, string> = {
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

  private static readonly CURRENCY_PATTERNS = [
    // $50.00, $50, $50.5
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
    // €50.00, €50
    /€(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
    // £50.00, £50
    /£(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
    // 50 USD, 50.00 USD, 50 dollars
    /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:USD|usd|dollars?|bucks?)\b/gi,
    // 50 EUR, 50.00 EUR, 50 euros
    /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:EUR|eur|euros?)\b/gi,
    // 50 GBP, 50.00 GBP, 50 pounds
    /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:GBP|gbp|pounds?)\b/gi,
    // Plain numbers (lowest confidence)
    /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g,
  ];

  /**
   * Parse amount from text message
   */
  static parseAmount(text: string, defaultCurrency = this.DEFAULT_CURRENCY): ParsedAmount | null {
    const cleanText = text.trim();

    // Try pattern-based parsing
    for (let i = 0; i < this.CURRENCY_PATTERNS.length; i++) {
      const pattern = this.CURRENCY_PATTERNS[i];
      const matches = Array.from(cleanText.matchAll(pattern));

      if (matches.length > 0) {
        const match = matches[0];
        const amountStr = match[1];

        // Remove commas and parse
        const numericAmount = parseFloat(amountStr.replace(/,/g, ''));

        if (isNaN(numericAmount) || numericAmount <= 0) {
          continue;
        }

        // Determine currency based on pattern index and text context
        let detectedCurrency = defaultCurrency;
        let confidence = 0.8;

        switch (i) {
          case 0: // $
            detectedCurrency = 'USD';
            confidence = 0.95;
            break;
          case 1: // €
            detectedCurrency = 'EUR';
            confidence = 0.95;
            break;
          case 2: // £
            detectedCurrency = 'GBP';
            confidence = 0.95;
            break;
          case 3: // USD text
            detectedCurrency = 'USD';
            confidence = 0.9;
            break;
          case 4: // EUR text
            detectedCurrency = 'EUR';
            confidence = 0.9;
            break;
          case 5: // GBP text
            detectedCurrency = 'GBP';
            confidence = 0.9;
            break;
          case 6: // Plain number
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

    // Try with currency.js for edge cases
    try {
      const parsed = currency(cleanText);
      if (parsed.value > 0) {
        return {
          amount: parsed.value,
          currency: defaultCurrency,
          rawInput: cleanText,
          confidence: 0.5,
        };
      }
    } catch (error) {
      // currency.js parsing failed
    }

    return null;
  }

  /**
   * Parse multiple amounts from text
   */
  static parseMultipleAmounts(text: string, defaultCurrency = this.DEFAULT_CURRENCY): ParsedAmount[] {
    const amounts: ParsedAmount[] = [];
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

  /**
   * Format amount for display
   */
  static formatAmount(
    amount: number,
    options: CurrencyFormatOptions = {}
  ): string {
    const {
      currency: curr = this.DEFAULT_CURRENCY,
      locale = 'en-US',
      symbol = true,
      precision = 2,
    } = options;

    try {
      const formatted = new Intl.NumberFormat(locale, {
        style: symbol ? 'currency' : 'decimal',
        currency: curr,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(amount);

      return formatted;
    } catch (error) {
      // Fallback formatting
      const fixed = amount.toFixed(precision);
      return symbol ? `$${fixed}` : fixed;
    }
  }

  /**
   * Convert amount between currencies (placeholder for future implementation)
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    // TODO: Implement actual currency conversion using exchange rate API
    // For now, return the same amount
    if (fromCurrency === toCurrency) {
      return amount;
    }

    console.warn('Currency conversion not implemented, returning original amount');
    return amount;
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currencyCode: string): boolean {
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
      'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'SEK', 'NOK',
      'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'ZAR', 'THB', 'MYR',
    ];

    return validCurrencies.includes(currencyCode.toUpperCase());
  }

  /**
   * Get currency symbol from code
   */
  static getCurrencySymbol(currencyCode: string): string {
    const symbols: Record<string, string> = {
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

  /**
   * Detect currency from symbol
   */
  static detectCurrencyFromSymbol(symbol: string): string | null {
    return this.CURRENCY_SYMBOLS[symbol] || null;
  }

  /**
   * Normalize amount string (remove formatting)
   */
  static normalizeAmountString(amountStr: string): string {
    return amountStr
      .replace(/[^\d.-]/g, '') // Remove non-numeric characters except . and -
      .replace(/,/g, '') // Remove commas
      .trim();
  }

  /**
   * Validate amount format
   */
  static isValidAmount(amount: any): boolean {
    if (typeof amount === 'number') {
      return !isNaN(amount) && isFinite(amount) && amount >= 0;
    }

    if (typeof amount === 'string') {
      const parsed = parseFloat(this.normalizeAmountString(amount));
      return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
    }

    return false;
  }

  /**
   * Extract amounts with context (for better parsing)
   */
  static extractAmountsWithContext(text: string): Array<{
    amount: ParsedAmount;
    context: string;
    position: number;
  }> {
    const results: Array<{
      amount: ParsedAmount;
      context: string;
      position: number;
    }> = [];

    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const parsed = this.parseAmount(word);

      if (parsed) {
        // Get context (words before and after)
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

  /**
   * Smart amount detection for financial messages
   */
  static smartParseFinancialAmount(text: string): ParsedAmount | null {
    const lowerText = text.toLowerCase();

    // Look for financial keywords to improve confidence
    const expenseKeywords = ['spent', 'paid', 'cost', 'expense', 'bill', 'bought'];
    const incomeKeywords = ['earned', 'received', 'income', 'salary', 'paid', 'bonus'];

    const hasExpenseContext = expenseKeywords.some(keyword => lowerText.includes(keyword));
    const hasIncomeContext = incomeKeywords.some(keyword => lowerText.includes(keyword));

    const parsed = this.parseAmount(text);

    if (parsed && (hasExpenseContext || hasIncomeContext)) {
      // Boost confidence for financial context
      parsed.confidence = Math.min(parsed.confidence + 0.2, 1.0);
    }

    return parsed;
  }
}