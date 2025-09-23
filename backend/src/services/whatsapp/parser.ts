import OpenAI from 'openai';
import * as chrono from 'chrono-node';
import currency from 'currency.js';
import nlp from 'compromise';

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

export class MessageParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Parse incoming message using AI and fallback methods
   */
  async parseMessage(message: string): Promise<ParsedMessage> {
    const cleanMessage = message.trim().toLowerCase();

    // Handle basic commands first
    if (this.isBasicCommand(cleanMessage)) {
      return this.parseBasicCommand(cleanMessage, message);
    }

    try {
      // Try AI parsing first
      const aiResult = await this.parseWithAI(message);
      if (aiResult.confidence > 0.7) {
        return this.processAIResult(aiResult, message);
      }
    } catch (error) {
      console.error('AI parsing failed:', error);
    }

    // Fallback to rule-based parsing
    return this.parseWithRules(message);
  }

  /**
   * Check if message is a basic command
   */
  private isBasicCommand(message: string): boolean {
    const basicCommands = [
      'help', 'balance', 'status', 'accounts', 'categories',
      'expenses this month', 'income this month', 'budget status',
      'last week expenses', 'this week expenses', 'monthly report',
      'yearly report', 'spending report', 'income report'
    ];

    return basicCommands.some(cmd => message.includes(cmd));
  }

  /**
   * Parse basic commands
   */
  private parseBasicCommand(cleanMessage: string, originalMessage: string): ParsedMessage {
    let intent = 'unknown';
    const entities: any = {};

    if (cleanMessage.includes('help')) {
      intent = 'help';
    } else if (cleanMessage.includes('balance')) {
      intent = 'balance_query';
    } else if (cleanMessage.includes('budget status')) {
      intent = 'budget_status';
    } else if (cleanMessage.includes('expenses') || cleanMessage.includes('spending')) {
      intent = 'expense_report';
      entities.period = this.extractPeriod(cleanMessage);
    } else if (cleanMessage.includes('income')) {
      intent = 'income_report';
      entities.period = this.extractPeriod(cleanMessage);
    }

    return {
      intent,
      entities,
      confidence: 0.9,
      originalMessage,
    };
  }

  /**
   * Parse message using OpenAI
   */
  private async parseWithAI(message: string): Promise<OpenAIResponse> {
    const prompt = `
Parse this financial message and extract intent and entities. Respond only with valid JSON.

Message: "${message}"

Valid intents:
- add_expense: Adding an expense/spending money
- add_income: Adding income/receiving money
- transfer: Moving money between accounts
- balance_query: Checking account balances
- expense_report: Viewing expense reports
- income_report: Viewing income reports
- budget_status: Checking budget status
- help: Getting help
- verify: Verification commands
- unknown: Cannot determine intent

Extract entities:
- amount: numerical amount (number only)
- category: expense/income category
- description: transaction description
- date: relative date like "yesterday", "last friday" (keep as text)
- accountFrom: source account name
- accountTo: destination account name
- period: time period like "this month", "last week"

Example responses:
{"intent": "add_expense", "entities": {"amount": 25.50, "category": "food", "description": "lunch at cafe"}, "confidence": 0.95}
{"intent": "transfer", "entities": {"amount": 200, "accountFrom": "checking", "accountTo": "savings"}, "confidence": 0.90}
{"intent": "balance_query", "entities": {}, "confidence": 0.95}

Response:`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Process AI result and normalize entities
   */
  private processAIResult(aiResult: OpenAIResponse, originalMessage: string): ParsedMessage {
    const entities = { ...aiResult.entities };

    // Parse date if provided
    if (entities.date) {
      const parsedDate = chrono.parseDate(entities.date);
      entities.date = parsedDate || new Date();
    }

    // Check if amount needs confirmation (large amounts)
    if (entities.amount && entities.amount > 500) {
      entities.confirmationNeeded = true;
    }

    return {
      intent: aiResult.intent,
      entities,
      confidence: aiResult.confidence,
      originalMessage,
    };
  }

  /**
   * Parse message using rule-based approach
   */
  private parseWithRules(message: string): ParsedMessage {
    const cleanMessage = message.toLowerCase();
    const doc = nlp(message);

    // Extract amount using currency parsing
    const amount = this.extractAmount(message);

    // Determine intent based on keywords
    let intent = 'unknown';
    const entities: any = {};

    if (amount) {
      if (this.hasExpenseKeywords(cleanMessage)) {
        intent = 'add_expense';
        entities.amount = amount;
        entities.category = this.extractCategory(cleanMessage);
        entities.description = this.extractDescription(message, amount);
      } else if (this.hasIncomeKeywords(cleanMessage)) {
        intent = 'add_income';
        entities.amount = amount;
        entities.category = this.extractIncomeCategory(cleanMessage);
        entities.description = this.extractDescription(message, amount);
      } else if (this.hasTransferKeywords(cleanMessage)) {
        intent = 'transfer';
        entities.amount = amount;
        const accounts = this.extractAccounts(cleanMessage);
        entities.accountFrom = accounts.from;
        entities.accountTo = accounts.to;
      }
    }

    // Extract date
    const parsedDate = chrono.parseDate(message);
    if (parsedDate) {
      entities.date = parsedDate;
    }

    // Large amount confirmation
    if (entities.amount && entities.amount > 500) {
      entities.confirmationNeeded = true;
    }

    return {
      intent,
      entities,
      confidence: intent === 'unknown' ? 0.2 : 0.7,
      originalMessage: message,
    };
  }

  /**
   * Extract amount from message
   */
  private extractAmount(message: string): number | undefined {
    try {
      // Look for currency patterns: $50, 50.00, 50 dollars, etc.
      const patterns = [
        /\$(\d+(?:\.\d{2})?)/,           // $50, $50.00
        /(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|bucks?)/i, // 50 dollars, 50.00 USD
        /(\d+(?:\.\d{2})?)\s*(?=\s|$)/,  // Just numbers
      ];

      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (!isNaN(amount) && amount > 0) {
            return amount;
          }
        }
      }

      // Try currency.js for more complex parsing
      const currencyMatch = message.match(/(\d+(?:[,.]?\d+)*(?:\.\d{2})?)/);
      if (currencyMatch) {
        const parsed = currency(currencyMatch[1]);
        return parsed.value;
      }
    } catch (error) {
      console.error('Error extracting amount:', error);
    }

    return undefined;
  }

  /**
   * Check for expense keywords
   */
  private hasExpenseKeywords(message: string): boolean {
    const expenseKeywords = [
      'spent', 'paid', 'bought', 'purchase', 'expense', 'cost', 'add expense',
      'bill', 'fee', 'charge', 'shopping', 'food', 'gas', 'coffee'
    ];
    return expenseKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check for income keywords
   */
  private hasIncomeKeywords(message: string): boolean {
    const incomeKeywords = [
      'income', 'received', 'got paid', 'salary', 'wage', 'earn', 'bonus',
      'deposit', 'payment', 'refund', 'add income'
    ];
    return incomeKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check for transfer keywords
   */
  private hasTransferKeywords(message: string): boolean {
    const transferKeywords = [
      'transfer', 'move', 'send', 'from', 'to', 'between'
    ];
    return transferKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Extract category from expense message
   */
  private extractCategory(message: string): string | undefined {
    const categories: Record<string, string[]> = {
      'Food': ['food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'snack', 'meal', 'coffee', 'cafe'],
      'Transportation': ['gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking', 'car'],
      'Shopping': ['shopping', 'clothes', 'amazon', 'store', 'mall', 'online'],
      'Bills': ['bill', 'utilities', 'electricity', 'water', 'internet', 'phone', 'rent'],
      'Entertainment': ['movie', 'cinema', 'game', 'book', 'music', 'concert', 'show'],
      'Health': ['doctor', 'hospital', 'pharmacy', 'medicine', 'medical', 'dental'],
      'Education': ['school', 'course', 'book', 'tuition', 'class', 'training'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return undefined;
  }

  /**
   * Extract income category
   */
  private extractIncomeCategory(message: string): string | undefined {
    const categories: Record<string, string[]> = {
      'Salary': ['salary', 'wage', 'paycheck', 'work'],
      'Freelance': ['freelance', 'contract', 'client', 'project'],
      'Investment': ['dividend', 'interest', 'investment', 'stock'],
      'Business': ['business', 'revenue', 'sales', 'profit'],
      'Other': ['bonus', 'gift', 'refund', 'cashback'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Extract description from message
   */
  private extractDescription(message: string, amount: number): string {
    // Remove amount and common command words
    let description = message
      .replace(/\$?\d+(?:\.\d{2})?/g, '')
      .replace(/\b(add|expense|income|spent|paid|bought|received|got|for|on)\b/gi, '')
      .trim();

    // Clean up extra spaces
    description = description.replace(/\s+/g, ' ').trim();

    return description || 'Transaction';
  }

  /**
   * Extract accounts from transfer message
   */
  private extractAccounts(message: string): { from?: string; to?: string } {
    const fromMatch = message.match(/from\s+(\w+)/i);
    const toMatch = message.match(/to\s+(\w+)/i);

    return {
      from: fromMatch ? fromMatch[1] : undefined,
      to: toMatch ? toMatch[1] : undefined,
    };
  }

  /**
   * Extract time period from message
   */
  private extractPeriod(message: string): string {
    if (message.includes('this month')) return 'this_month';
    if (message.includes('last month')) return 'last_month';
    if (message.includes('this week')) return 'this_week';
    if (message.includes('last week')) return 'last_week';
    if (message.includes('this year')) return 'this_year';
    if (message.includes('today')) return 'today';
    if (message.includes('yesterday')) return 'yesterday';

    return 'this_month'; // default
  }
}