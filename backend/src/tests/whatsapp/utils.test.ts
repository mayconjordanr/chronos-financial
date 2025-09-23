import { CurrencyParser } from '../../utils/currency-parser';
import { DateParser } from '../../utils/date-parser';
import { MessageFormatter } from '../../utils/message-formatter';

describe('CurrencyParser', () => {
  describe('parseAmount', () => {
    it('should parse dollar amounts correctly', () => {
      const testCases = [
        { input: '$50.00', expected: 50.00 },
        { input: '$50', expected: 50 },
        { input: '$1,234.56', expected: 1234.56 },
        { input: '50 dollars', expected: 50 },
        { input: '50.25 USD', expected: 50.25 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = CurrencyParser.parseAmount(input);
        expect(result?.amount).toBe(expected);
        expect(result?.currency).toBe('USD');
      });
    });

    it('should parse other currencies', () => {
      const testCases = [
        { input: '€50.00', expected: { amount: 50, currency: 'EUR' } },
        { input: '£25.50', expected: { amount: 25.5, currency: 'GBP' } },
        { input: '100 EUR', expected: { amount: 100, currency: 'EUR' } },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = CurrencyParser.parseAmount(input);
        expect(result?.amount).toBe(expected.amount);
        expect(result?.currency).toBe(expected.currency);
      });
    });

    it('should handle plain numbers', () => {
      const result = CurrencyParser.parseAmount('123.45');
      expect(result?.amount).toBe(123.45);
      expect(result?.currency).toBe('USD'); // Default currency
      expect(result?.confidence).toBeLessThan(0.8); // Lower confidence for plain numbers
    });

    it('should return null for invalid input', () => {
      const invalidInputs = ['abc', 'no amount here', '', '$0', '$-5'];

      invalidInputs.forEach(input => {
        const result = CurrencyParser.parseAmount(input);
        expect(result).toBeNull();
      });
    });

    it('should parse multiple amounts', () => {
      const result = CurrencyParser.parseMultipleAmounts('I spent $50 on food and $25 on gas');

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50);
      expect(result[1].amount).toBe(25);
    });

    it('should handle smart financial parsing', () => {
      const result = CurrencyParser.smartParseFinancialAmount('I spent $50 on groceries');

      expect(result?.amount).toBe(50);
      expect(result?.confidence).toBeGreaterThan(0.8); // Higher confidence for financial context
    });
  });

  describe('formatAmount', () => {
    it('should format currency correctly', () => {
      const result = CurrencyParser.formatAmount(1234.56, { currency: 'USD' });
      expect(result).toBe('$1,234.56');
    });

    it('should handle different locales', () => {
      const result = CurrencyParser.formatAmount(1234.56, {
        currency: 'EUR',
        locale: 'de-DE'
      });
      expect(result).toContain('1.234,56'); // German formatting
    });

    it('should format without symbol', () => {
      const result = CurrencyParser.formatAmount(1234.56, { symbol: false });
      expect(result).toBe('1,234.56');
    });
  });

  describe('validation', () => {
    it('should validate currency codes', () => {
      expect(CurrencyParser.isValidCurrency('USD')).toBe(true);
      expect(CurrencyParser.isValidCurrency('EUR')).toBe(true);
      expect(CurrencyParser.isValidCurrency('INVALID')).toBe(false);
    });

    it('should validate amounts', () => {
      expect(CurrencyParser.isValidAmount(50)).toBe(true);
      expect(CurrencyParser.isValidAmount('50.25')).toBe(true);
      expect(CurrencyParser.isValidAmount(-5)).toBe(false);
      expect(CurrencyParser.isValidAmount('invalid')).toBe(false);
    });
  });
});

describe('DateParser', () => {
  const referenceDate = new Date('2023-06-15T12:00:00Z'); // Thursday

  describe('parseDate', () => {
    it('should parse relative dates', () => {
      const testCases = [
        { input: 'today', expectedDays: 0 },
        { input: 'yesterday', expectedDays: -1 },
        { input: 'tomorrow', expectedDays: 1 },
      ];

      testCases.forEach(({ input, expectedDays }) => {
        const result = DateParser.parseDate(input, referenceDate);
        expect(result).toBeTruthy();

        const expectedDate = new Date(referenceDate);
        expectedDate.setDate(expectedDate.getDate() + expectedDays);

        const daysDiff = Math.floor((result!.date.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(Math.abs(daysDiff)).toBeLessThanOrEqual(1); // Allow for timezone differences
      });
    });

    it('should parse specific dates', () => {
      const result = DateParser.parseDate('June 20, 2023', referenceDate);
      expect(result).toBeTruthy();
      expect(result!.date.getMonth()).toBe(5); // June = 5
      expect(result!.date.getDate()).toBe(20);
      expect(result!.date.getFullYear()).toBe(2023);
    });

    it('should parse days of week', () => {
      const result = DateParser.parseDate('last Monday', referenceDate);
      expect(result).toBeTruthy();
      expect(result!.isRelative).toBe(true);
    });

    it('should return null for invalid dates', () => {
      const result = DateParser.parseDate('not a date', referenceDate);
      expect(result).toBeNull();
    });
  });

  describe('parsePeriod', () => {
    it('should parse period ranges', () => {
      const periods = ['this month', 'last week', 'this year'];

      periods.forEach(period => {
        const result = DateParser.parsePeriod(period, referenceDate);
        expect(result).toBeTruthy();
        expect(result!.start).toBeInstanceOf(Date);
        expect(result!.end).toBeInstanceOf(Date);
        expect(result!.start.getTime()).toBeLessThan(result!.end.getTime());
      });
    });
  });

  describe('getPeriodRange', () => {
    it('should generate correct period ranges', () => {
      const thisMonthRange = DateParser.getPeriodRange('this_month', referenceDate);

      expect(thisMonthRange.start.getDate()).toBe(1); // First day of month
      expect(thisMonthRange.start.getMonth()).toBe(referenceDate.getMonth());
      expect(thisMonthRange.end.getMonth()).toBe(referenceDate.getMonth());
    });

    it('should handle week ranges correctly', () => {
      const thisWeekRange = DateParser.getPeriodRange('this_week', referenceDate);

      // Should start on Sunday (day 0)
      expect(thisWeekRange.start.getDay()).toBe(0);

      // Should end on Saturday
      expect(thisWeekRange.end.getDay()).toBe(6);
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-06-15T12:00:00Z');

    it('should format dates in different styles', () => {
      const short = DateParser.formatDate(testDate, 'short');
      const medium = DateParser.formatDate(testDate, 'medium');
      const long = DateParser.formatDate(testDate, 'long');

      expect(short).toContain('Jun');
      expect(medium).toContain('2023');
      expect(long).toContain('Thursday');
    });

    it('should format relative dates', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const result = DateParser.formatDate(yesterday, 'relative');
      expect(result).toBe('yesterday');
    });
  });
});

describe('MessageFormatter', () => {
  describe('formatTransactionConfirmation', () => {
    it('should format expense confirmation', () => {
      const transaction = {
        amount: 50,
        type: 'EXPENSE' as const,
        category: 'Food',
        account: 'Checking',
        balance: 950,
      };

      const result = MessageFormatter.formatTransactionConfirmation(transaction);

      expect(result).toContain('Expense recorded');
      expect(result).toContain('$50.00');
      expect(result).toContain('Food');
      expect(result).toContain('Checking');
      expect(result).toContain('$950.00');
    });

    it('should format income confirmation', () => {
      const transaction = {
        amount: 5000,
        type: 'INCOME' as const,
        account: 'Checking',
        balance: 6000,
      };

      const result = MessageFormatter.formatTransactionConfirmation(transaction);

      expect(result).toContain('Income recorded');
      expect(result).toContain('$5,000.00');
      expect(result).toContain('$6,000.00');
    });

    it('should format without emojis when disabled', () => {
      const transaction = {
        amount: 50,
        type: 'EXPENSE' as const,
        account: 'Checking',
        balance: 950,
      };

      const result = MessageFormatter.formatTransactionConfirmation(transaction, {
        includeEmojis: false,
      });

      expect(result).not.toContain('💸');
      expect(result).not.toContain('✅');
    });
  });

  describe('formatBalanceInfo', () => {
    it('should format multiple account balances', () => {
      const balances = [
        { account: 'Checking', balance: 1000, type: 'CHECKING' },
        { account: 'Savings', balance: 5000, type: 'SAVINGS' },
      ];

      const result = MessageFormatter.formatBalanceInfo(balances);

      expect(result).toContain('Your Account Balances');
      expect(result).toContain('Checking: $1,000.00');
      expect(result).toContain('Savings: $5,000.00');
      expect(result).toContain('Total: $6,000.00');
    });
  });

  describe('formatSpendingReport', () => {
    it('should format expense report with categories', () => {
      const report = {
        period: 'This Month',
        expenses: [
          { category: 'Food', amount: 300 },
          { category: 'Transportation', amount: 150 },
        ],
        total: 450,
      };

      const result = MessageFormatter.formatSpendingReport(report);

      expect(result).toContain('This Month Expenses');
      expect(result).toContain('Food: $300.00');
      expect(result).toContain('Transportation: $150.00');
      expect(result).toContain('Total: $450.00');
    });

    it('should include budget information when provided', () => {
      const report = {
        period: 'This Month',
        expenses: [{ category: 'Food', amount: 300 }],
        total: 300,
        budget: 500,
      };

      const result = MessageFormatter.formatSpendingReport(report);

      expect(result).toContain('Budget: $500.00');
      expect(result).toContain('Remaining: $200.00');
      expect(result).toContain('60.0%');
    });
  });

  describe('formatError', () => {
    it('should format error messages', () => {
      const result = MessageFormatter.formatError('Invalid amount', 'Try using numbers only');

      expect(result).toContain('❌');
      expect(result).toContain('Invalid amount');
      expect(result).toContain('Try using numbers only');
      expect(result).toContain('Send "help"');
    });
  });

  describe('formatHelp', () => {
    it('should format comprehensive help message', () => {
      const result = MessageFormatter.formatHelp();

      expect(result).toContain('CHRONOS WhatsApp Commands');
      expect(result).toContain('EXPENSES');
      expect(result).toContain('INCOME');
      expect(result).toContain('TRANSFERS');
      expect(result).toContain('REPORTS');
      expect(result).toContain('add expense 50 food');
    });

    it('should format help without emojis', () => {
      const result = MessageFormatter.formatHelp({ includeEmojis: false });

      expect(result).not.toContain('💡');
      expect(result).not.toContain('💸');
    });
  });

  describe('message truncation', () => {
    it('should truncate long messages', () => {
      const longTransaction = {
        amount: 50,
        type: 'EXPENSE' as const,
        account: 'Very Long Account Name That Exceeds Normal Limits',
        balance: 950,
        description: 'A very long description that goes on and on and contains way too much detail for a simple transaction',
      };

      const result = MessageFormatter.formatTransactionConfirmation(longTransaction, {
        maxLength: 100,
      });

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('...');
    });
  });

  describe('currency formatting', () => {
    it('should format different currencies', () => {
      const transaction = {
        amount: 50,
        type: 'EXPENSE' as const,
        account: 'Checking',
        balance: 950,
      };

      const result = MessageFormatter.formatTransactionConfirmation(transaction, {
        currency: 'EUR',
        locale: 'en-US',
      });

      expect(result).toContain('€50.00');
    });
  });
});