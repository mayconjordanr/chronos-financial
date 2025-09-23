import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { returnUrl } = await req.json()

    // TODO: Get customer ID from user session/auth
    // For now, using a mock approach to find customer
    const customerEmail = 'user@example.com'

    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length === 0) {
      return NextResponse.json(
        { error: 'No customer found' },
        { status: 404 }
      )
    }

    const customer = existingCustomers.data[0]

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || `${req.nextUrl.origin}/billing`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}