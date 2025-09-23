"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandler = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("./client");
const parser_1 = require("./parser");
const commands_1 = require("./commands");
const prisma = new client_1.PrismaClient();
class WebhookHandler {
    parser;
    commandHandler;
    constructor() {
        this.parser = new parser_1.MessageParser();
        this.commandHandler = new commands_1.CommandHandler();
    }
    async processWebhook(body) {
        try {
            const phoneNumber = this.extractPhoneNumber(body.From);
            if (!phoneNumber) {
                console.error('Invalid phone number format:', body.From);
                return;
            }
            const whatsappUser = await this.findOrCreateWhatsAppUser(phoneNumber, body.ProfileName);
            if (!whatsappUser) {
                await this.handleUnregisteredUser(phoneNumber, body.Body);
                return;
            }
            await this.logMessage(body, whatsappUser);
            if (await this.isRateLimited(whatsappUser.id)) {
                await client_2.whatsAppClient.sendError(phoneNumber, 'Too many messages. Please wait a moment.');
                return;
            }
            const parseResult = await this.parser.parseMessage(body.Body);
            const context = {
                tenantId: whatsappUser.tenantId,
                userId: whatsappUser.userId,
                whatsappUser,
            };
            await this.commandHandler.handleCommand(parseResult, phoneNumber, context);
        }
        catch (error) {
            console.error('Webhook processing error:', error);
            const phoneNumber = this.extractPhoneNumber(body.From);
            if (phoneNumber) {
                await client_2.whatsAppClient.sendError(phoneNumber, 'Sorry, there was an error processing your message.');
            }
        }
    }
    verifySignature(signature, url, body) {
        const authToken = process.env.TWILIO_AUTH_TOKEN || '';
        return client_2.WhatsAppClient.verifyWebhook(signature, url, body, authToken);
    }
    extractPhoneNumber(twilioNumber) {
        const match = twilioNumber.match(/whatsapp:(\+?\d+)/);
        return match ? match[1] : null;
    }
    async findOrCreateWhatsAppUser(phoneNumber, profileName) {
        try {
            let whatsappUser = await prisma.whatsAppUser.findUnique({
                where: { phoneNumber },
                include: {
                    user: true,
                    tenant: true,
                },
            });
            if (whatsappUser && whatsappUser.isVerified) {
                return whatsappUser;
            }
            const user = await prisma.user.findFirst({
                where: { phone: phoneNumber },
                include: { tenant: true },
            });
            if (!user) {
                return null;
            }
            whatsappUser = await prisma.whatsAppUser.upsert({
                where: { phoneNumber },
                update: {
                    whatsappNumber: phoneNumber,
                    ...(profileName && { preferences: { displayName: profileName } }),
                },
                create: {
                    tenantId: user.tenantId,
                    userId: user.id,
                    phoneNumber,
                    whatsappNumber: phoneNumber,
                    isVerified: false,
                    preferences: profileName ? { displayName: profileName } : {},
                },
                include: {
                    user: true,
                    tenant: true,
                },
            });
            return whatsappUser;
        }
        catch (error) {
            console.error('Error finding/creating WhatsApp user:', error);
            return null;
        }
    }
    async handleUnregisteredUser(phoneNumber, message) {
        if (message.toLowerCase().includes('register') || message.toLowerCase().includes('start')) {
            const welcomeMessage = `Welcome to CHRONOS Financial! 👋

To start using WhatsApp integration, you need to:

1. Create your CHRONOS account at our web app
2. Add this phone number (${phoneNumber}) to your profile
3. Verify your WhatsApp integration

Once registered, you can manage your finances with simple messages like:
• "add expense 50 food"
• "balance"
• "expenses this month"

Get started at: ${process.env.FRONTEND_URL || 'https://chronos.app'}`;
            await client_2.whatsAppClient.sendMessage({ to: phoneNumber, body: welcomeMessage });
        }
        else {
            const message = `❌ Phone number not registered.

Send "register" to get started with CHRONOS Financial, or visit our website to create your account first.`;
            await client_2.whatsAppClient.sendMessage({ to: phoneNumber, body: message });
        }
    }
    async logMessage(body, whatsappUser) {
        try {
            await prisma.whatsAppMessage.create({
                data: {
                    tenantId: whatsappUser.tenantId,
                    whatsappUserId: whatsappUser.id,
                    messageSid: body.MessageSid,
                    direction: 'INBOUND',
                    content: body.Body,
                    createdAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error('Error logging message:', error);
        }
    }
    async isRateLimited(whatsappUserId) {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const messageCount = await prisma.whatsAppMessage.count({
                where: {
                    whatsappUserId,
                    direction: 'INBOUND',
                    createdAt: {
                        gte: fiveMinutesAgo,
                    },
                },
            });
            return messageCount >= 10;
        }
        catch (error) {
            console.error('Error checking rate limit:', error);
            return false;
        }
    }
    async sendVerificationCode(phoneNumber) {
        try {
            const whatsappUser = await prisma.whatsAppUser.findUnique({
                where: { phoneNumber },
            });
            if (!whatsappUser) {
                return { success: false };
            }
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await prisma.whatsAppUser.update({
                where: { id: whatsappUser.id },
                data: {
                    verificationCode: code,
                    verificationExpiresAt: expiresAt,
                },
            });
            const message = `🔐 CHRONOS Verification Code: ${code}

This code expires in 10 minutes. Reply with "verify ${code}" to activate WhatsApp integration.`;
            await client_2.whatsAppClient.sendMessage({ to: phoneNumber, body: message });
            return { success: true, code };
        }
        catch (error) {
            console.error('Error sending verification code:', error);
            return { success: false };
        }
    }
    async verifyUser(phoneNumber, code) {
        try {
            const whatsappUser = await prisma.whatsAppUser.findUnique({
                where: { phoneNumber },
            });
            if (!whatsappUser || !whatsappUser.verificationCode || !whatsappUser.verificationExpiresAt) {
                return false;
            }
            if (whatsappUser.verificationCode === code && whatsappUser.verificationExpiresAt > new Date()) {
                await prisma.whatsAppUser.update({
                    where: { id: whatsappUser.id },
                    data: {
                        isVerified: true,
                        verificationCode: null,
                        verificationExpiresAt: null,
                    },
                });
                const welcomeMessage = `✅ WhatsApp integration activated!

You can now manage your finances with simple messages:

💸 Add expenses: "add expense 50 food"
💰 Add income: "income 5000 salary"
💳 Check balance: "balance"
📊 View reports: "expenses this month"

Type "help" anytime for all commands.`;
                await client_2.whatsAppClient.sendMessage({ to: phoneNumber, body: welcomeMessage });
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error verifying user:', error);
            return false;
        }
    }
}
exports.WebhookHandler = WebhookHandler;
//# sourceMappingURL=webhook.js.map