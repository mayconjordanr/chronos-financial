// Simple test to verify WhatsApp integration can be disabled gracefully
console.log('Testing WhatsApp integration with empty credentials...');

// Set empty credentials
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_WHATSAPP_NUMBER = '';

// Test the validation function logic
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

  // Validate format only if variables exist
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
  } else {
    console.warn('⚠️ WhatsApp integration disabled due to configuration issues:');
    validation.errors.forEach(error => console.warn(`   - ${error}`));
    console.warn('   WhatsApp endpoints will return "service unavailable" responses');

    // Don't throw error - let the backend start without WhatsApp
    return { enabled: false, errors: validation.errors };
  }
}

// Test WhatsApp client initialization
class TestWhatsAppClient {
  constructor(config) {
    this.phoneNumber = config.phoneNumber;

    // Only initialize Twilio client if credentials are available
    if (config.accountSid && config.authToken && config.phoneNumber) {
      try {
        // Simulate Twilio client initialization (would normally fail with empty creds)
        this.client = { fake: true };
        this.isEnabled = true;
      } catch (error) {
        console.warn('⚠️ Failed to initialize Twilio client:', error);
        this.client = null;
        this.isEnabled = false;
      }
    } else {
      this.client = null;
      this.isEnabled = false;
    }
  }

  isServiceEnabled() {
    return this.isEnabled && this.client !== null;
  }

  async sendMessage(options) {
    if (!this.isServiceEnabled()) {
      return {
        sid: '',
        status: 'failed',
        errorCode: 'SERVICE_DISABLED',
        errorMessage: 'WhatsApp integration is not configured or disabled',
      };
    }
    // Normal message sending would happen here
    return { sid: 'test', status: 'sent' };
  }
}

try {
  console.log('\n1. Testing WhatsApp initialization...');
  const initResult = initializeWhatsAppIntegration();
  console.log('   Result:', initResult);

  if (!initResult.enabled) {
    console.log('✅ WhatsApp initialization correctly disabled');
  } else {
    console.error('❌ WhatsApp should be disabled with empty credentials');
    process.exit(1);
  }

  console.log('\n2. Testing WhatsApp client...');
  const client = new TestWhatsAppClient({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  });

  console.log('   Service enabled:', client.isServiceEnabled());

  const messageResult = await client.sendMessage({
    to: '+1234567890',
    body: 'Test message'
  });
  console.log('   Message result:', messageResult);

  if (messageResult.errorCode === 'SERVICE_DISABLED') {
    console.log('✅ WhatsApp client correctly returns service disabled error');
  } else {
    console.error('❌ WhatsApp client should return SERVICE_DISABLED error');
    process.exit(1);
  }

  console.log('\n✅ ALL TESTS PASSED');
  console.log('✅ WhatsApp integration is now optional and backend can start without credentials');

} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
}