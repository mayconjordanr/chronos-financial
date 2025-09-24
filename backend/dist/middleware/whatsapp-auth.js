"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTwilioWebhook = verifyTwilioWebhook;
exports.validateWhatsAppPayload = validateWhatsAppPayload;
exports.whatsAppRateLimit = whatsAppRateLimit;
exports.logWhatsAppRequest = logWhatsAppRequest;
exports.whatsAppWebhookSecurity = whatsAppWebhookSecurity;
exports.handleWebhookVerification = handleWebhookVerification;
exports.whatsAppErrorHandler = whatsAppErrorHandler;
exports.validateWhatsAppConfig = validateWhatsAppConfig;
exports.initializeWhatsAppIntegration = initializeWhatsAppIntegration;
const client_1 = require("../services/whatsapp/client");
async function verifyTwilioWebhook(request, reply) {
    try {
        const signature = request.headers['x-twilio-signature'];
        if (!signature) {
            reply.code(401).send({ error: 'Missing Twilio signature' });
            return;
        }
        const protocol = request.headers['x-forwarded-proto'] || 'https';
        const host = request.headers.host;
        const url = `${protocol}://${host}${request.url}`;
        const rawBody = JSON.stringify(request.body);
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
            reply.code(500).send({ error: 'Twilio auth token not configured' });
            return;
        }
        const isValid = client_1.WhatsAppClient.verifyWebhook(signature, url, rawBody, authToken);
        if (!isValid) {
            reply.code(401).send({ error: 'Invalid Twilio signature' });
            return;
        }
    }
    catch (error) {
        console.error('Webhook verification error:', error);
        reply.code(401).send({ error: 'Webhook verification failed' });
    }
}
async function validateWhatsAppPayload(request, reply) {
    const body = request.body;
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
    if (!body.From.startsWith('whatsapp:')) {
        reply.code(400).send({ error: 'Invalid phone number format' });
        return;
    }
    if (typeof body.Body !== 'string') {
        reply.code(400).send({ error: 'Message body must be a string' });
        return;
    }
    if (body.Body.length > 4096) {
        reply.code(400).send({ error: 'Message too long' });
        return;
    }
}
async function whatsAppRateLimit(request, reply) {
    try {
        const body = request.body;
        const phoneNumber = body.From;
        if (!phoneNumber) {
            return;
        }
        const redis = request.server.redis;
        if (redis) {
            const key = `whatsapp_rate_limit:${phoneNumber}`;
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, 60);
            }
            if (current > 5) {
                reply.code(429).send({
                    error: 'Rate limit exceeded',
                    retryAfter: await redis.ttl(key)
                });
                return;
            }
        }
    }
    catch (error) {
        console.error('Rate limiting error:', error);
    }
}
async function logWhatsAppRequest(request, _reply) {
    const body = request.body;
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
async function whatsAppWebhookSecurity(request, reply) {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
        console.warn('⚠️ Skipping webhook verification in development mode');
        return;
    }
    await verifyTwilioWebhook(request, reply);
}
async function handleWebhookVerification(request, reply) {
    if (request.method === 'GET') {
        const hubChallenge = request.query['hub.challenge'];
        if (hubChallenge) {
            reply.type('text/plain').send(hubChallenge);
            return;
        }
    }
}
async function whatsAppErrorHandler(error, request, reply) {
    console.error('WhatsApp webhook error:', {
        error: error.message,
        stack: error.stack,
        body: request.body,
        headers: request.headers,
    });
    reply.code(200).send({
        status: 'error_handled',
        message: 'Error logged internally'
    });
}
function validateWhatsAppConfig() {
    const requiredVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_NUMBER',
    ];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    const errors = [];
    if (missing.length > 0) {
        errors.push(`Missing required environment variables: ${missing.join(', ')}`);
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (accountSid && !accountSid.startsWith('AC')) {
        errors.push('Invalid TWILIO_ACCOUNT_SID format (should start with AC)');
    }
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (whatsappNumber && !whatsappNumber.startsWith('+')) {
        console.warn('⚠️ TWILIO_WHATSAPP_NUMBER should include country code (e.g., +1234567890)');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function initializeWhatsAppIntegration() {
    const validation = validateWhatsAppConfig();
    if (validation.isValid) {
        console.log('✅ WhatsApp integration configuration validated - WhatsApp enabled');
        return { enabled: true };
    }
    else {
        console.warn('⚠️ WhatsApp integration disabled due to configuration issues:');
        validation.errors.forEach(error => console.warn(`   - ${error}`));
        console.warn('   WhatsApp endpoints will return "service unavailable" responses');
        return { enabled: false, errors: validation.errors };
    }
}
//# sourceMappingURL=whatsapp-auth.js.map