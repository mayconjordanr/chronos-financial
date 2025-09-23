import { FastifyRequest, FastifyReply } from 'fastify';
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
export declare function verifyTwilioWebhook(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function validateWhatsAppPayload(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function whatsAppRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function logWhatsAppRequest(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function whatsAppWebhookSecurity(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function handleWebhookVerification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function whatsAppErrorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function validateWhatsAppConfig(): void;
export declare function initializeWhatsAppIntegration(): void;
//# sourceMappingURL=whatsapp-auth.d.ts.map