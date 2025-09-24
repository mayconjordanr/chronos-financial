// Direct test of WhatsApp initialization functions
import { spawn } from 'child_process';

console.log('Testing WhatsApp initialization directly via tsx...');

const testCode = `
// Test the initializeWhatsAppIntegration function directly with tsx
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_WHATSAPP_NUMBER = '';

try {
  const { initializeWhatsAppIntegration } = await import('./backend/src/middleware/whatsapp-auth.ts');
  console.log('✅ Successfully imported WhatsApp auth module');

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
`;

const child = spawn('npx', ['tsx', '-e', testCode], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_WHATSAPP_NUMBER: '',
  },
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ WhatsApp integration test passed');
  } else {
    console.log('❌ WhatsApp integration test failed with exit code:', code);
  }
});