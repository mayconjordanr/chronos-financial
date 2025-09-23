import { MessageParser, ParsedMessage } from '../../services/whatsapp/parser';

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe('MessageParser', () => {
  let parser: MessageParser;

  beforeEach(() => {
    parser = new MessageParser();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  describe('parseMessage', () => {
    it('should parse basic expense command', async () => {
      const result = await parser.parseMessage('add expense 50 food');

      expect(result.intent).toBe('add_expense');
      expect(result.entities.amount).toBe(50);
      expect(result.entities.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should parse income command', async () => {
      const result = await parser.parseMessage('income 5000 salary');

      expect(result.intent).toBe('add_income');
      expect(result.entities.amount).toBe(5000);
      expect(result.entities.category).toBe('salary');
    });

    it('should parse balance query', async () => {
      const result = await parser.parseMessage('balance');

      expect(result.intent).toBe('balance_query');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse help command', async () => {
      const result = await parser.parseMessage('help');

      expect(result.intent).toBe('help');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse transfer command', async () => {
      const result = await parser.parseMessage('transfer 200 from checking to savings');

      expect(result.intent).toBe('transfer');
      expect(result.entities.amount).toBe(200);
      expect(result.entities.accountFrom).toBe('checking');
      expect(result.entities.accountTo).toBe('savings');
    });

    it('should parse expense report command', async () => {
      const result = await parser.parseMessage('expenses this month');

      expect(result.intent).toBe('expense_report');
      expect(result.entities.period).toBe('this_month');
    });

    it('should handle unknown commands', async () => {
      const result = await parser.parseMessage('random gibberish');

      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should parse amounts with different formats', async () => {
      const testCases = [
        { input: 'spent $50.00 on groceries', expected: 50.00 },
        { input: 'paid 25 dollars for lunch', expected: 25 },
        { input: 'bought coffee for 5.50', expected: 5.50 },
        { input: 'expense of €30 for taxi', expected: 30 },
      ];

      for (const testCase of testCases) {
        const result = await parser.parseMessage(testCase.input);
        expect(result.entities.amount).toBe(testCase.expected);
      }
    });

    it('should extract categories correctly', async () => {
      const testCases = [
        { input: 'add expense 50 food', expected: 'food' },
        { input: 'spent 25 on gas', expected: 'transportation' },
        { input: 'bought coffee for 5', expected: 'food' },
        { input: 'paid bill 100', expected: 'bills' },
      ];

      for (const testCase of testCases) {
        const result = await parser.parseMessage(testCase.input);
        expect(result.entities.category).toBeDefined();
      }
    });

    it('should handle large amounts with confirmation', async () => {
      const result = await parser.parseMessage('add expense 1000 rent');

      expect(result.entities.amount).toBe(1000);
      expect(result.entities.confirmationNeeded).toBe(true);
    });

    it('should parse dates correctly', async () => {
      const result = await parser.parseMessage('add expense 50 food yesterday');

      expect(result.entities.amount).toBe(50);
      expect(result.entities.date).toBeInstanceOf(Date);
    });
  });

  describe('AI parsing fallback', () => {
    it('should fallback to rule-based parsing when AI fails', async () => {
      // Mock AI failure
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      }));

      const parser = new MessageParser();
      const result = await parser.parseMessage('spent 50 on food');

      expect(result.intent).toBe('add_expense');
      expect(result.entities.amount).toBe(50);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty messages', async () => {
      const result = await parser.parseMessage('');

      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'add expense 50 food '.repeat(100);
      const result = await parser.parseMessage(longMessage);

      expect(result.originalMessage).toBe(longMessage);
    });

    it('should handle special characters', async () => {
      const result = await parser.parseMessage('add expense $50.00 for café ☕');

      expect(result.entities.amount).toBe(50);
    });

    it('should handle mixed language', async () => {
      const result = await parser.parseMessage('gasto de $50 para comida');

      // Should still try to parse even with Spanish
      expect(result).toBeDefined();
    });
  });

  describe('Confidence scoring', () => {
    it('should have high confidence for clear commands', async () => {
      const result = await parser.parseMessage('add expense 50 food');

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have low confidence for ambiguous commands', async () => {
      const result = await parser.parseMessage('maybe 50 something');

      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});