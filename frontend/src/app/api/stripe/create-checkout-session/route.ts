import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    // TODO: Get user from session/auth
    // For now, using a mock customer email
    const customerEmail = 'user@example.com'

    // Check if customer already exists
    let customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          // TODO: Add user ID from your auth system
          userId: 'mock_user_id',
        },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.nextUrl.origin}/billing?success=true`,
      cancel_url: cancelUrl || `${req.nextUrl.origin}/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        trial_period_days: priceId === STRIPE_PRICE_IDS.starter ? undefined : 14, // 14-day trial for paid plans
        metadata: {
          userId: 'mock_user_id', // TODO: Replace with actual user ID
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}