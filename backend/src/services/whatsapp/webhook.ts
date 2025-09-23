import { PrismaClient } from '@prisma/client';
import { whatsAppClient, WhatsAppClient } from './client';
import { MessageParser } from './parser';
import { CommandHandler } from './commands';

const prisma = new PrismaClient();

export interface TwilioWebhookBody {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  WaId?: string;
  SmsStatus?: string;
  AccountSid: string;
}

export interface WebhookContext {
  tenantId: string;
  userId?: string;
  whatsappUser?: any;
}

export class WebhookHandler {
  private parser: MessageParser;
  private commandHandler: CommandHandler;

  constructor() {
    this.parser = new MessageParser();
    this.commandHandler = new CommandHandler();
  }

  /**
   * Process incoming WhatsApp webhook
   */
  async processWebhook(body: TwilioWebhookBody): Promise<void> {
    try {
      // Extract phone number from Twilio format (whatsapp:+1234567890)
      const phoneNumber = this.extractPhoneNumber(body.From);

      if (!phoneNumber) {
        console.error('Invalid phone number format:', body.From);
        return;
      }

      // Find or create WhatsApp user
      const whatsappUser = await this.findOrCreateWhatsAppUser(phoneNumber, body.ProfileName);

      if (!whatsappUser) {
        await this.handleUnregisteredUser(phoneNumber, body.Body);
        return;
      }

      // Log the message
      await this.logMessage(body, whatsappUser);

      // Rate limiting check
      if (await this.isRateLimited(whatsappUser.id)) {
        await whatsAppClient.sendError(phoneNumber, 'Too many messages. Please wait a moment.');
        return;
      }

      // Parse the message
      const parseResult = await this.parser.parseMessage(body.Body);

      // Handle the command
      const context: WebhookContext = {
        tenantId: whatsappUser.tenantId,
        userId: whatsappUser.userId,
        whatsappUser,
      };

      await this.commandHandler.handleCommand(parseResult, phoneNumber, context);

    } catch (error) {
      console.error('Webhook processing error:', error);
      // Send error message to user if we can extract phone number
      const phoneNumber = this.extractPhoneNumber(body.From);
      if (phoneNumber) {
        await whatsAppClient.sendError(phoneNumber, 'Sorry, there was an error processing your message.');
      }
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(signature: string, url: string, body: string): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    return WhatsAppClient.verifyWebhook(signature, url, body, authToken);
  }

  /**
   * Extract phone number from Twilio format
   */
  private extractPhoneNumber(twilioNumber: string): string | null {
    const match = twilioNumber.match(/whatsapp:(\+?\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Find or create WhatsApp user
   */
  private async findOrCreateWhatsAppUser(phoneNumber: string, profileName?: string) {
    try {
      // First, try to find existing WhatsApp user
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

      // If not found or not verified, check if user exists by phone
      const user = await prisma.user.findFirst({
        where: { phone: phoneNumber },
        include: { tenant: true },
      });

      if (!user) {
        return null; // User needs to register first
      }

      // Create or update WhatsApp user
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
    } catch (error) {
      console.error('Error finding/creating WhatsApp user:', error);
      return null;
    }
  }

  /**
   * Handle unregistered user
   */
  private async handleUnregisteredUser(phoneNumber: string, message: string): Promise<void> {
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

      await whatsAppClient.sendMessage({ to: phoneNumber, body: welcomeMessage });
    } else {
      const message = `❌ Phone number not registered.

Send "register" to get started with CHRONOS Financial, or visit our website to create your account first.`;

      await whatsAppClient.sendMessage({ to: phoneNumber, body: message });
    }
  }

  /**
   * Log incoming message
   */
  private async logMessage(body: TwilioWebhookBody, whatsappUser: any): Promise<void> {
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
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  /**
   * Check rate limiting
   */
  private async isRateLimited(whatsappUserId: string): Promise<boolean> {
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

      // Allow max 10 messages per 5 minutes
      return messageCount >= 10;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; code?: string }> {
    try {
      const whatsappUser = await prisma.whatsAppUser.findUnique({
        where: { phoneNumber },
      });

      if (!whatsappUser) {
        return { success: false };
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with verification code
      await prisma.whatsAppUser.update({
        where: { id: whatsappUser.id },
        data: {
          verificationCode: code,
          verificationExpiresAt: expiresAt,
        },
      });

      // Send verification message
      const message = `🔐 CHRONOS Verification Code: ${code}

This code expires in 10 minutes. Reply with "verify ${code}" to activate WhatsApp integration.`;

      await whatsAppClient.sendMessage({ to: phoneNumber, body: message });

      return { success: true, code };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return { success: false };
    }
  }

  /**
   * Verify user code
   */
  async verifyUser(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const whatsappUser = await prisma.whatsAppUser.findUnique({
        where: { phoneNumber },
      });

      if (!whatsappUser || !whatsappUser.verificationCode || !whatsappUser.verificationExpiresAt) {
        return false;
      }

      // Check if code is valid and not expired
      if (whatsappUser.verificationCode === code && whatsappUser.verificationExpiresAt > new Date()) {
        // Mark as verified
        await prisma.whatsAppUser.update({
          where: { id: whatsappUser.id },
          data: {
            isVerified: true,
            verificationCode: null,
            verificationExpiresAt: null,
          },
        });

        // Send welcome message
        const welcomeMessage = `✅ WhatsApp integration activated!

You can now manage your finances with simple messages:

💸 Add expenses: "add expense 50 food"
💰 Add income: "income 5000 salary"
💳 Check balance: "balance"
📊 View reports: "expenses this month"

Type "help" anytime for all commands.`;

        await whatsAppClient.sendMessage({ to: phoneNumber, body: welcomeMessage });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }
}