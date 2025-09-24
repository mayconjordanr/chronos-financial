"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLinkEmail = sendMagicLinkEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: false,
    auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    } : undefined
});
async function sendMagicLinkEmail(email, token, tenantId) {
    const magicLinkUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}&tenant=${tenantId}`;
    const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@chronos.app',
        to: email,
        subject: 'Your CHRONOS Magic Link',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign in to CHRONOS</h2>
        <p>Click the link below to sign in to your account:</p>
        <a href="${magicLinkUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Sign In
        </a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
    };
    await transporter.sendMail(mailOptions);
}
//# sourceMappingURL=email.js.map