import crypto from 'crypto'

export interface WebhookTestResult {
  success: boolean
  message: string
  details?: any
}

export class WebhookTester {
  /**
   * Verify Stripe webhook signature
   */
  static verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string
  ): WebhookTestResult {
    try {
      const elements = signature.split(',')
      const signatureElements: Record<string, string> = {}

      for (const element of elements) {
        const [key, value] = element.split('=')
        signatureElements[key] = value
      }

      if (!signatureElements.t || !signatureElements.v1) {
        return {
          success: false,
          message: 'Invalid signature format'
        }
      }

      const timestamp = signatureElements.t
      const signatures = [signatureElements.v1]

      // Add v0 signature if present
      if (signatureElements.v0) {
        signatures.push(signatureElements.v0)
      }

      const signedPayload = `${timestamp}.${payload}`
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex')

      const isValid = signatures.some(sig =>
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(sig, 'hex')
        )
      )

      if (!isValid) {
        return {
          success: false,
          message: 'Signature verification failed',
          details: {
            expectedSignature,
            receivedSignatures: signatures
          }
        }
      }

      // Check timestamp tolerance (5 minutes)
      const now = Math.floor(Date.now() / 1000)
      const timestampAge = now - parseInt(timestamp)
      const tolerance = 300 // 5 minutes

      if (timestampAge > tolerance) {
        return {
          success: false,
          message: 'Timestamp outside tolerance window',
          details: {
            timestampAge,
            tolerance
          }
        }
      }

      return {
        success: true,
        message: 'Signature verified successfully',
        details: {
          timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
          age: timestampAge
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'Error verifying signature',
        details: error
      }
    }
  }

  /**
   * Create a test webhook signature for development
   */
  static createTestSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const signedPayload = `${timestamp}.${payload}`
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex')

    return `t=${timestamp},v1=${signature}`
  }

  /**
   * Generate test webhook events for development
   */
  static generateTestEvents() {
    const customerId = 'cus_test_customer'
    const subscriptionId = 'sub_test_subscription'

    return {
      subscriptionCreated: {
        id: 'evt_test_subscription_created',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'trialing',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000),
            trial_end: Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000),
            items: {
              data: [{
                price: {
                  id: 'price_pro_monthly',
                  recurring: { interval: 'month' }
                }
              }]
            }
          }
        }
      },

      subscriptionUpdated: {
        id: 'evt_test_subscription_updated',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
          }
        }
      },

      trialWillEnd: {
        id: 'evt_test_trial_will_end',
        object: 'event',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'trialing',
            trial_end: Math.floor((Date.now() + 3 * 24 * 60 * 60 * 1000) / 1000)
          }
        }
      },

      paymentSucceeded: {
        id: 'evt_test_payment_succeeded',
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_invoice',
            object: 'invoice',
            customer: customerId,
            subscription: subscriptionId,
            amount_paid: 2900,
            amount_due: 2900,
            currency: 'usd',
            status: 'paid'
          }
        }
      },

      paymentFailed: {
        id: 'evt_test_payment_failed',
        object: 'event',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_invoice_failed',
            object: 'invoice',
            customer: customerId,
            subscription: subscriptionId,
            amount_due: 2900,
            currency: 'usd',
            status: 'open'
          }
        }
      }
    }
  }

  /**
   * Test webhook endpoint with sample events
   */
  static async testWebhookEndpoint(
    webhookUrl: string,
    eventType: keyof ReturnType<typeof WebhookTester.generateTestEvents>,
    secret: string
  ): Promise<WebhookTestResult> {
    try {
      const events = this.generateTestEvents()
      const event = events[eventType]
      const payload = JSON.stringify(event)
      const signature = this.createTestSignature(payload, secret)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature
        },
        body: payload
      })

      if (!response.ok) {
        return {
          success: false,
          message: `Webhook returned ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText
          }
        }
      }

      const responseData = await response.json()

      return {
        success: true,
        message: 'Webhook test successful',
        details: {
          eventType,
          responseStatus: response.status,
          responseData
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'Error testing webhook',
        details: error
      }
    }
  }

  /**
   * Run comprehensive webhook tests
   */
  static async runWebhookTests(webhookUrl: string, secret: string): Promise<{
    passed: number
    failed: number
    results: Array<{ test: string; result: WebhookTestResult }>
  }> {
    const testEvents: Array<keyof ReturnType<typeof WebhookTester.generateTestEvents>> = [
      'subscriptionCreated',
      'subscriptionUpdated',
      'trialWillEnd',
      'paymentSucceeded',
      'paymentFailed'
    ]

    const results = []
    let passed = 0
    let failed = 0

    for (const eventType of testEvents) {
      const result = await this.testWebhookEndpoint(webhookUrl, eventType, secret)
      results.push({
        test: eventType,
        result
      })

      if (result.success) {
        passed++
      } else {
        failed++
      }
    }

    return { passed, failed, results }
  }
}