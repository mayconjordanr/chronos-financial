// Test WhatsApp initialization without full server startup
const { initializeWhatsAppIntegration } = require('./backend/dist/middleware/whatsapp-auth.js');

console.log('Testing WhatsApp initialization...');

// Test with empty credentials
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_WHATSAPP_NUMBER = '';

try {
  const result = initializeWhatsAppIntegration();
  console.log('✅ WhatsApp initialization result:', result);

  if (!result.enabled) {
    console.log('✅ WhatsApp integration properly disabled due to missing credentials');
    process.exit(0);
  } else {
    console.log('❌ Expected WhatsApp to be disabled with empty credentials');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ WhatsApp initialization threw an error (should not happen):', error);
  process.exit(1);
}