import { FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppClient } from '../services/whatsapp/client';

export interface WhatsAppWebhookRequest extends FastifyRequest {
  body: {
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
  };
}

/**
 * Middleware to verify Twilio webhook signatures
 */
export async function verifyTwilioWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const signature = request.headers['x-twilio-signature'] as string;

    if (!signature) {
      reply.code(401).send({ error: 'Missing Twilio signature' });
      return;
    }

    // Get the full URL for verification
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers.host;
    const url = `${protocol}://${host}${request.url}`;

    // Get raw body for verification
    const rawBody = JSON.stringify(request.body);

    // Verify signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      reply.code(500).send({ error: 'Twilio auth token not configured' });
      return;
    }

    const isValid = WhatsAppClient.verifyWebhook(signature, url, rawBody, authToken);

    if (!isValid) {
      reply.code(401).send({ error: 'Invalid Twilio signature' });
      return;
    }

    // Signature is valid, continue to route handler
  } catch (error) {
    console.error('Webhook verification error:', error);
    reply.code(401).send({ error: 'Webhook verification failed' });
  }
}

/**
 * Middleware to validate webhook payload structure
 */
export async function validateWhatsAppPayload(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = request.body as any;

  // Required fields for WhatsApp webhook
  const requiredFields = ['MessageSid', 'From', 'To', 'Body', 'AccountSid'];

  for (const field of requiredFields) {
    if (!body[field]) {
      reply.code(400).send({
        error: `Missing required field: ${field}`,
        received: Object.keys(body)
      });
      return;
    }
  }

  // Validate phone number format
  if (!body.From.startsWith('whatsapp:')) {
    reply.code(400).send({ error: 'Invalid phone number format' });
    return;
  }

  // Validate message content
  if (typeof body.Body !== 'string') {
    reply.code(400).send({ error: 'Message body must be a string' });
    return;
  }

  // Check message length (WhatsApp limit is 4096 characters)
  if (body.Body.length > 4096) {
    reply.code(400).send({ error: 'Message too long' });
    return;
  }
}

/**
 * Rate limiting middleware for WhatsApp endpoints
 */
export async function whatsAppRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const body = request.body as any;
    const phoneNumber = body.From;

    if (!phoneNumber) {
      return; // Skip rate limiting if no phone number
    }

    // Use Redis for rate limiting if available
    const redis = (request.server as any).redis;
    if (redis) {
      const key = `whatsapp_rate_limit:${phoneNumber}`;
      const current = await redis.incr(key);

      if (current === 1) {
        // First request, set TTL to 1 minute
        await redis.expire(key, 60);
      }

      // Allow max 5 requests per minute per phone number
      if (current > 5) {
        reply.code(429).send({
          error: 'Rate limit exceeded',
          retryAfter: await redis.ttl(key)
        });
        return;
      }
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block the request if rate limiting fails
  }
}

/**
 * Middleware to log WhatsApp webhook requests
 */
export async function logWhatsAppRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = request.body as any;

  console.log('WhatsApp webhook received:', {
    messageSid: body.MessageSid,
    from: body.From,
    to: body.To,
    bodyLength: body.Body?.length || 0,
    timestamp: new Date().toISOString(),
    userAgent: request.headers['user-agent'],
    ip: request.ip,
  });
}

/**
 * Combined middleware for WhatsApp webhook security
 */
export async function whatsAppWebhookSecurity(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip verification in development mode
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
    console.warn('⚠️ Skipping webhook verification in development mode');
    return;
  }

  await verifyTwilioWebhook(request, reply);
}

/**
 * Middleware to handle webhook verification requests from Twilio
 */
export async function handleWebhookVerification(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Twilio sends GET requests for webhook verification
  if (request.method === 'GET') {
    const hubChallenge = (request.query as any)['hub.challenge'];

    if (hubChallenge) {
      reply.type('text/plain').send(hubChallenge);
      return;
    }
  }
}

/**
 * Error handler for WhatsApp webhook endpoints
 */
export async function whatsAppErrorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.error('WhatsApp webhook error:', {
    error: error.message,
    stack: error.stack,
    body: request.body,
    headers: request.headers,
  });

  // Always return 200 to Twilio to prevent retries
  // (We handle errors internally)
  reply.code(200).send({
    status: 'error_handled',
    message: 'Error logged internally'
  });
}

/**
 * Validate environment variables for WhatsApp integration
 */
export function validateWhatsAppConfig(): void {
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_NUMBER',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for WhatsApp integration: ${missing.join(', ')}`);
  }

  // Validate format
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (accountSid && !accountSid.startsWith('AC')) {
    throw new Error('Invalid TWILIO_ACCOUNT_SID format');
  }

  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  if (whatsappNumber && !whatsappNumber.startsWith('+')) {
    console.warn('⚠️ TWILIO_WHATSAPP_NUMBER should include country code (e.g., +1234567890)');
  }
}

/**
 * Initialize WhatsApp integration
 */
export function initializeWhatsAppIntegration(): void {
  try {
    validateWhatsAppConfig();
    console.log('✅ WhatsApp integration configuration validated');
  } catch (error) {
    console.error('❌ WhatsApp integration configuration error:', error);

    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn('⚠️ WhatsApp integration disabled in development mode due to configuration error');
    }
  }
}