# WhatsApp Integration for CHRONOS Financial

This document provides comprehensive setup instructions and documentation for the WhatsApp integration with CHRONOS Financial SaaS application.

## Overview

The WhatsApp integration allows users to manage their finances through natural language commands via WhatsApp. Users can add expenses, record income, transfer money, check balances, and generate reports using simple text messages.

## Features

### 🤖 AI-Powered Message Parsing
- Uses OpenAI GPT for natural language understanding
- Supports multiple languages (English, Spanish)
- Fallback to rule-based parsing for reliability
- Confidence scoring for better accuracy

### 💬 Supported Commands
- **Expenses**: "add expense 50 food", "spent 25 on gas", "bought coffee for 5"
- **Income**: "income 5000 salary", "received 100 from freelance", "got paid 3000"
- **Transfers**: "transfer 200 from checking to savings", "move 50 to emergency fund"
- **Balance**: "balance", "how much do I have?", "account balances"
- **Reports**: "expenses this month", "income this week", "budget status"

### 🔒 Security Features
- Twilio webhook signature verification
- Phone number verification with 6-digit codes
- Rate limiting (10 messages per 5 minutes)
- Tenant isolation and RLS compliance
- Large amount confirmation for transactions >$500

### 📊 Smart Features
- Auto-categorization of transactions
- Date parsing ("yesterday", "last Friday", etc.)
- Currency parsing ($50, 50 dollars, €30, etc.)
- Emoji-rich formatted responses
- Context-aware error handling

## Architecture

```
WhatsApp → Twilio → Webhook → Parser → Commands → Database
                       ↓
                   AI Processing
                       ↓
                   Response Formatting → Twilio → WhatsApp
```

## Database Schema

The integration adds two new tables to the existing schema:

### whatsapp_users
```sql
CREATE TABLE whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  whatsapp_number VARCHAR(20) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_expires_at TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### whatsapp_messages
```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  whatsapp_user_id UUID REFERENCES whatsapp_users(id),
  message_sid VARCHAR(100) UNIQUE,
  direction VARCHAR(10) CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  content TEXT,
  intent VARCHAR(50),
  entities JSONB,
  processed_at TIMESTAMP,
  response_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# OpenAI Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WhatsApp Configuration
SKIP_WEBHOOK_VERIFICATION=false  # Set to true in development only
FRONTEND_URL=https://your-app.com  # For verification links

# Database (already configured)
DATABASE_URL=postgresql://username:password@localhost:5432/chronos_dev
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install twilio openai chrono-node compromise currency.js
```

### 2. Database Migration

```bash
# Generate and apply migration
npx prisma migrate dev --name add-whatsapp-integration

# Generate Prisma client
npx prisma generate
```

### 3. Twilio Setup

1. **Create Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)

2. **Get WhatsApp Sandbox**:
   - Go to Console → Messaging → Try it out → Send a WhatsApp message
   - Note the sandbox number (e.g., +1 415 523 8886)

3. **Configure Webhook**:
   - Webhook URL: `https://your-domain.com/api/whatsapp/webhook`
   - HTTP Method: POST
   - Make sure your server is accessible from the internet

4. **Get Credentials**:
   - Account SID from Twilio Console dashboard
   - Auth Token from Twilio Console dashboard

### 4. OpenAI Setup

1. **Create OpenAI Account**: Sign up at [openai.com](https://openai.com)
2. **Generate API Key**: Go to API Keys section and create a new key
3. **Set Usage Limits**: Configure monthly limits to control costs

### 5. Start the Server

```bash
npm run dev
```

The WhatsApp integration will be available at `/api/whatsapp/*` endpoints.

## API Endpoints

### Webhook Endpoints
- `GET /api/whatsapp/webhook` - Webhook verification
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages

### Management Endpoints (Authenticated)
- `POST /api/whatsapp/link-phone` - Link phone number to user
- `POST /api/whatsapp/send-verification` - Send verification code
- `POST /api/whatsapp/verify` - Verify phone number with code
- `GET /api/whatsapp/status` - Check integration status
- `POST /api/whatsapp/send` - Send message to user
- `GET /api/whatsapp/messages` - Get message history
- `DELETE /api/whatsapp/unlink` - Remove WhatsApp integration

### Development Endpoints
- `POST /api/whatsapp/test` - Test message processing (dev only)

## User Onboarding Flow

### 1. Account Registration
Users must first create a CHRONOS account through the web app.

### 2. Phone Number Linking
```javascript
// Frontend API call
const response = await fetch('/api/whatsapp/link-phone', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890'
  })
});
```

### 3. WhatsApp Verification
1. User receives 6-digit code via WhatsApp
2. User replies with "verify 123456" or uses web interface
3. Integration is activated upon successful verification

### 4. Start Using
User can now send financial commands via WhatsApp:
- "add expense 50 food"
- "balance"
- "help"

## Command Examples

### Adding Expenses
```
User: "add expense 50 food"
Bot: "💸 Expense recorded!
💵 Amount: $50.00
🍕 Category: Food
🏦 Account: Checking Account
💳 New Balance: $1,250.00
✅ Transaction saved successfully!"
```

### Balance Inquiry
```
User: "balance"
Bot: "💰 Your Account Balances:
🏦 Checking: $1,250.00
💰 Savings: $5,000.00
📊 Total: $6,250.00"
```

### Monthly Report
```
User: "expenses this month"
Bot: "📊 December Expenses:
🍕 Food: $450.00
⛽ Transportation: $200.00
🏠 Bills: $800.00
💰 Total: $1,450.00"
```

### Transfer Money
```
User: "transfer 200 from checking to savings"
Bot: "💸 Transfer completed!
📤 From: Checking Account - $200.00
📥 To: Savings Account + $200.00
💳 Checking Account: $1,050.00
💳 Savings Account: $5,200.00
✅ Transfer successful!"
```

## Error Handling

### Common Errors and Solutions

1. **"Phone number not registered"**
   - Solution: User needs to create account and link phone number first

2. **"Invalid verification code"**
   - Solution: Check code is correct and not expired (10-minute limit)

3. **"No accounts found"**
   - Solution: User needs to create at least one account in web app

4. **"Rate limit exceeded"**
   - Solution: Wait before sending more messages (10 per 5 minutes)

5. **"Large amount confirmation needed"**
   - Solution: User should reply with "confirm" for amounts >$500

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=whatsapp
```

### Integration Testing
```bash
# Test webhook processing
curl -X POST http://localhost:3001/api/whatsapp/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "add expense 50 food",
    "phoneNumber": "+1234567890"
  }'
```

### Production Testing
1. Send test message to Twilio sandbox number
2. Join sandbox: Send "join <sandbox-code>" to the Twilio number
3. Test commands: "add expense 10 test"

## Monitoring & Analytics

### Message Analytics
- Total messages processed
- Intent recognition accuracy
- Response time metrics
- Error rates by command type

### Database Queries
```sql
-- Message volume by day
SELECT DATE(created_at) as date, COUNT(*) as messages
FROM whatsapp_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Intent accuracy
SELECT intent, COUNT(*) as count
FROM whatsapp_messages
WHERE direction = 'INBOUND'
GROUP BY intent;

-- Active users
SELECT COUNT(DISTINCT whatsapp_user_id) as active_users
FROM whatsapp_messages
WHERE created_at >= NOW() - INTERVAL '7 days';
```

## Security Considerations

### Webhook Security
- Always verify Twilio signatures in production
- Use HTTPS for all webhook endpoints
- Implement proper rate limiting

### Data Privacy
- Message content is logged for debugging
- Implement data retention policies
- Consider encryption for sensitive data

### Access Control
- Phone number verification required
- Tenant isolation enforced
- User-specific transaction access only

## Scaling Considerations

### High Volume Handling
- Implement message queuing for high-volume scenarios
- Use Redis for rate limiting and caching
- Consider webhook retries and idempotency

### Performance Optimization
- Cache frequently accessed data
- Optimize database queries
- Implement connection pooling

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check webhook URL is publicly accessible
   - Verify Twilio webhook configuration
   - Check server logs for errors

2. **AI parsing not working**
   - Verify OpenAI API key is valid
   - Check API usage limits
   - Review fallback parsing logic

3. **Database connection issues**
   - Verify database is running
   - Check connection string
   - Review database logs

### Debug Mode
Set `NODE_ENV=development` and `SKIP_WEBHOOK_VERIFICATION=true` for easier debugging.

### Logs
Monitor these logs for issues:
- Webhook processing errors
- Database transaction failures
- OpenAI API errors
- Rate limiting triggers

## Cost Considerations

### Twilio Costs
- WhatsApp messages: ~$0.005 per message
- Phone number verification: ~$0.05 per verification

### OpenAI Costs
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- Average message: ~50-100 tokens

### Optimization Tips
- Use rule-based parsing for simple commands
- Cache AI responses for common patterns
- Implement smart fallbacks

## Future Enhancements

### Planned Features
- Multi-language support expansion
- Voice message processing
- Image receipt processing
- Automated spending insights
- Budget alerts via WhatsApp

### Integration Opportunities
- Bank SMS forwarding
- Receipt scanning via photos
- Calendar integration for recurring transactions
- Location-based expense tracking

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test with the development endpoints
4. Contact the development team

## Contributing

When contributing to the WhatsApp integration:
1. Follow existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Test with real WhatsApp messages
5. Consider security implications

---

**Note**: This integration requires active Twilio and OpenAI accounts. Costs will be incurred based on usage. Monitor usage in production environments.