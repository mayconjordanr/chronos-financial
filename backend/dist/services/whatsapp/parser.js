"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageParser = void 0;
const openai_1 = __importDefault(require("openai"));
const chrono = __importStar(require("chrono-node"));
const currency_js_1 = __importDefault(require("currency.js"));
const compromise_1 = __importDefault(require("compromise"));
class MessageParser {
    openai;
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async parseMessage(message) {
        const cleanMessage = message.trim().toLowerCase();
        if (this.isBasicCommand(cleanMessage)) {
            return this.parseBasicCommand(cleanMessage, message);
        }
        try {
            const aiResult = await this.parseWithAI(message);
            if (aiResult.confidence > 0.7) {
                return this.processAIResult(aiResult, message);
            }
        }
        catch (error) {
            console.error('AI parsing failed:', error);
        }
        return this.parseWithRules(message);
    }
    isBasicCommand(message) {
        const basicCommands = [
            'help', 'balance', 'status', 'accounts', 'categories',
            'expenses this month', 'income this month', 'budget status',
            'last week expenses', 'this week expenses', 'monthly report',
            'yearly report', 'spending report', 'income report'
        ];
        return basicCommands.some(cmd => message.includes(cmd));
    }
    parseBasicCommand(cleanMessage, originalMessage) {
        let intent = 'unknown';
        const entities = {};
        if (cleanMessage.includes('help')) {
            intent = 'help';
        }
        else if (cleanMessage.includes('balance')) {
            intent = 'balance_query';
        }
        else if (cleanMessage.includes('budget status')) {
            intent = 'budget_status';
        }
        else if (cleanMessage.includes('expenses') || cleanMessage.includes('spending')) {
            intent = 'expense_report';
            entities.period = this.extractPeriod(cleanMessage);
        }
        else if (cleanMessage.includes('income')) {
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
    async parseWithAI(message) {
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
        }
        catch (error) {
            throw new Error('Invalid JSON response from OpenAI');
        }
    }
    processAIResult(aiResult, originalMessage) {
        const entities = { ...aiResult.entities };
        if (entities.date) {
            const parsedDate = chrono.parseDate(entities.date);
            entities.date = parsedDate || new Date();
        }
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
    parseWithRules(message) {
        const cleanMessage = message.toLowerCase();
        const doc = (0, compromise_1.default)(message);
        const amount = this.extractAmount(message);
        let intent = 'unknown';
        const entities = {};
        if (amount) {
            if (this.hasExpenseKeywords(cleanMessage)) {
                intent = 'add_expense';
                entities.amount = amount;
                entities.category = this.extractCategory(cleanMessage);
                entities.description = this.extractDescription(message, amount);
            }
            else if (this.hasIncomeKeywords(cleanMessage)) {
                intent = 'add_income';
                entities.amount = amount;
                entities.category = this.extractIncomeCategory(cleanMessage);
                entities.description = this.extractDescription(message, amount);
            }
            else if (this.hasTransferKeywords(cleanMessage)) {
                intent = 'transfer';
                entities.amount = amount;
                const accounts = this.extractAccounts(cleanMessage);
                entities.accountFrom = accounts.from;
                entities.accountTo = accounts.to;
            }
        }
        const parsedDate = chrono.parseDate(message);
        if (parsedDate) {
            entities.date = parsedDate;
        }
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
    extractAmount(message) {
        try {
            const patterns = [
                /\$(\d+(?:\.\d{2})?)/,
                /(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|bucks?)/i,
                /(\d+(?:\.\d{2})?)\s*(?=\s|$)/,
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
            const currencyMatch = message.match(/(\d+(?:[,.]?\d+)*(?:\.\d{2})?)/);
            if (currencyMatch) {
                const parsed = (0, currency_js_1.default)(currencyMatch[1]);
                return parsed.value;
            }
        }
        catch (error) {
            console.error('Error extracting amount:', error);
        }
        return undefined;
    }
    hasExpenseKeywords(message) {
        const expenseKeywords = [
            'spent', 'paid', 'bought', 'purchase', 'expense', 'cost', 'add expense',
            'bill', 'fee', 'charge', 'shopping', 'food', 'gas', 'coffee'
        ];
        return expenseKeywords.some(keyword => message.includes(keyword));
    }
    hasIncomeKeywords(message) {
        const incomeKeywords = [
            'income', 'received', 'got paid', 'salary', 'wage', 'earn', 'bonus',
            'deposit', 'payment', 'refund', 'add income'
        ];
        return incomeKeywords.some(keyword => message.includes(keyword));
    }
    hasTransferKeywords(message) {
        const transferKeywords = [
            'transfer', 'move', 'send', 'from', 'to', 'between'
        ];
        return transferKeywords.some(keyword => message.includes(keyword));
    }
    extractCategory(message) {
        const categories = {
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
    extractIncomeCategory(message) {
        const categories = {
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
    extractDescription(message, amount) {
        let description = message
            .replace(/\$?\d+(?:\.\d{2})?/g, '')
            .replace(/\b(add|expense|income|spent|paid|bought|received|got|for|on)\b/gi, '')
            .trim();
        description = description.replace(/\s+/g, ' ').trim();
        return description || 'Transaction';
    }
    extractAccounts(message) {
        const fromMatch = message.match(/from\s+(\w+)/i);
        const toMatch = message.match(/to\s+(\w+)/i);
        return {
            from: fromMatch ? fromMatch[1] : undefined,
            to: toMatch ? toMatch[1] : undefined,
        };
    }
    extractPeriod(message) {
        if (message.includes('this month'))
            return 'this_month';
        if (message.includes('last month'))
            return 'last_month';
        if (message.includes('this week'))
            return 'this_week';
        if (message.includes('last week'))
            return 'last_week';
        if (message.includes('this year'))
            return 'this_year';
        if (message.includes('today'))
            return 'today';
        if (message.includes('yesterday'))
            return 'yesterday';
        return 'this_month';
    }
}
exports.MessageParser = MessageParser;
//# sourceMappingURL=parser.js.map