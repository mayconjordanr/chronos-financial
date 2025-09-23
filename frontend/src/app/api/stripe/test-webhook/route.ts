import { NextRequest, NextResponse } from 'next/server'
import { WebhookTester } from '@/lib/utils/webhook-tester'

export async function POST(req: NextRequest) {
  try {
    const { eventType, webhookSecret } = await req.json()

    if (!eventType || !webhookSecret) {
      return NextResponse.json(
        { error: 'Event type and webhook secret are required' },
        { status: 400 }
      )
    }

    // Test webhook endpoint URL (use your actual webhook URL)
    const webhookUrl = `${req.nextUrl.origin}/api/stripe/webhooks`

    const result = await WebhookTester.testWebhookEndpoint(
      webhookUrl,
      eventType,
      webhookSecret
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const webhookSecret = req.nextUrl.searchParams.get('secret')

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret is required' },
        { status: 400 }
      )
    }

    // Test webhook endpoint URL
    const webhookUrl = `${req.nextUrl.origin}/api/stripe/webhooks`

    const results = await WebhookTester.runWebhookTests(webhookUrl, webhookSecret)

    return NextResponse.json({
      summary: {
        total: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed,
        success_rate: `${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`
      },
      results: results.results
    })

  } catch (error) {
    console.error('Error running webhook tests:', error)
    return NextResponse.json(
      { error: 'Failed to run webhook tests' },
      { status: 500 }
    )
  }
}