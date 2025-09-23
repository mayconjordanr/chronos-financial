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
export declare class WebhookHandler {
    private parser;
    private commandHandler;
    constructor();
    processWebhook(body: TwilioWebhookBody): Promise<void>;
    verifySignature(signature: string, url: string, body: string): boolean;
    private extractPhoneNumber;
    private findOrCreateWhatsAppUser;
    private handleUnregisteredUser;
    private logMessage;
    private isRateLimited;
    sendVerificationCode(phoneNumber: string): Promise<{
        success: boolean;
        code?: string;
    }>;
    verifyUser(phoneNumber: string, code: string): Promise<boolean>;
}
//# sourceMappingURL=webhook.d.ts.map