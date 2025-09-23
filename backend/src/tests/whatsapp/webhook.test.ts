import { WebhookHandler, TwilioWebhookBody } from '../../services/whatsapp/webhook';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../services/whatsapp/client');
jest.mock('../../services/whatsapp/parser');
jest.mock('../../services/whatsapp/commands');

const mockPrisma = {
  whatsAppUser: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  whatsAppMessage: {
    create: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
} as any;

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('WebhookHandler', () => {
  let webhookHandler: WebhookHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    webhookHandler = new WebhookHandler();
  });

  describe('processWebhook', () => {
    const mockWebhookBody: TwilioWebhookBody = {
      MessageSid: 'SM123456789',
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+1987654321',
      Body: 'add expense 50 food',
      AccountSid: 'AC123456789',
    };

    it('should process valid webhook correctly', async () => {
      // Mock verified WhatsApp user
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        phoneNumber: '+1234567890',
        isVerified: true,
      });

      await webhookHandler.processWebhook(mockWebhookBody);

      expect(mockPrisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          whatsappUserId: 'wa-user-1',
          messageSid: 'SM123456789',
          direction: 'INBOUND',
          content: 'add expense 50 food',
          createdAt: expect.any(Date),
        },
      });
    });

    it('should handle unregistered users', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await webhookHandler.processWebhook(mockWebhookBody);

      // Should send registration message
      expect(mockPrisma.whatsAppMessage.create).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        phoneNumber: '+1234567890',
        isVerified: true,
      });

      // Mock high message count (rate limited)
      mockPrisma.whatsAppMessage.count.mockResolvedValue(15);

      await webhookHandler.processWebhook(mockWebhookBody);

      // Should not process the message
      expect(mockPrisma.whatsAppMessage.create).not.toHaveBeenCalled();
    });

    it('should handle invalid phone number format', async () => {
      const invalidWebhookBody = {
        ...mockWebhookBody,
        From: 'invalid-format',
      };

      await webhookHandler.processWebhook(invalidWebhookBody);

      // Should not process anything
      expect(mockPrisma.whatsAppUser.findUnique).not.toHaveBeenCalled();
    });

    it('should create WhatsApp user for existing registered user', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
        phone: '+1234567890',
        tenant: { id: 'tenant-1' },
      });

      mockPrisma.whatsAppUser.upsert.mockResolvedValue({
        id: 'wa-user-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        phoneNumber: '+1234567890',
        isVerified: false,
      });

      await webhookHandler.processWebhook(mockWebhookBody);

      expect(mockPrisma.whatsAppUser.upsert).toHaveBeenCalled();
    });
  });

  describe('sendVerificationCode', () => {
    it('should generate and send verification code', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        phoneNumber: '+1234567890',
      });

      mockPrisma.whatsAppUser.update.mockResolvedValue({});

      const result = await webhookHandler.sendVerificationCode('+1234567890');

      expect(result.success).toBe(true);
      expect(result.code).toMatch(/^\d{6}$/);
      expect(mockPrisma.whatsAppUser.update).toHaveBeenCalledWith({
        where: { id: 'wa-user-1' },
        data: {
          verificationCode: expect.stringMatching(/^\d{6}$/),
          verificationExpiresAt: expect.any(Date),
        },
      });
    });

    it('should fail for non-existent phone number', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue(null);

      const result = await webhookHandler.sendVerificationCode('+1234567890');

      expect(result.success).toBe(false);
    });
  });

  describe('verifyUser', () => {
    it('should verify user with correct code', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        verificationCode: '123456',
        verificationExpiresAt: futureDate,
      });

      mockPrisma.whatsAppUser.update.mockResolvedValue({});

      const result = await webhookHandler.verifyUser('+1234567890', '123456');

      expect(result).toBe(true);
      expect(mockPrisma.whatsAppUser.update).toHaveBeenCalledWith({
        where: { id: 'wa-user-1' },
        data: {
          isVerified: true,
          verificationCode: null,
          verificationExpiresAt: null,
        },
      });
    });

    it('should fail with incorrect code', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        verificationCode: '123456',
        verificationExpiresAt: futureDate,
      });

      const result = await webhookHandler.verifyUser('+1234567890', '654321');

      expect(result).toBe(false);
    });

    it('should fail with expired code', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      mockPrisma.whatsAppUser.findUnique.mockResolvedValue({
        id: 'wa-user-1',
        verificationCode: '123456',
        verificationExpiresAt: pastDate,
      });

      const result = await webhookHandler.verifyUser('+1234567890', '123456');

      expect(result).toBe(false);
    });

    it('should fail for non-existent user', async () => {
      mockPrisma.whatsAppUser.findUnique.mockResolvedValue(null);

      const result = await webhookHandler.verifyUser('+1234567890', '123456');

      expect(result).toBe(false);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid Twilio signature', () => {
      process.env.TWILIO_AUTH_TOKEN = 'test-token';

      // Mock the static method
      const mockVerifyWebhook = jest.fn().mockReturnValue(true);
      require('../../services/whatsapp/client').WhatsAppClient.verifyWebhook = mockVerifyWebhook;

      const result = webhookHandler.verifySignature(
        'test-signature',
        'https://example.com/webhook',
        '{"test": "body"}'
      );

      expect(result).toBe(true);
      expect(mockVerifyWebhook).toHaveBeenCalledWith(
        'test-signature',
        'https://example.com/webhook',
        '{"test": "body"}',
        'test-token'
      );
    });

    it('should reject invalid signature', () => {
      process.env.TWILIO_AUTH_TOKEN = 'test-token';

      const mockVerifyWebhook = jest.fn().mockReturnValue(false);
      require('../../services/whatsapp/client').WhatsAppClient.verifyWebhook = mockVerifyWebhook;

      const result = webhookHandler.verifySignature(
        'invalid-signature',
        'https://example.com/webhook',
        '{"test": "body"}'
      );

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.whatsAppUser.findUnique.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(webhookHandler.processWebhook(mockWebhookBody)).resolves.not.toThrow();
    });

    it('should handle malformed webhook body', async () => {
      const malformedBody = {
        From: 'invalid',
        // Missing required fields
      } as any;

      await expect(webhookHandler.processWebhook(malformedBody)).resolves.not.toThrow();
    });
  });
});