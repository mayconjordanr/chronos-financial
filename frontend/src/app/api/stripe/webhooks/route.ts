import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    console.error('Missing stripe signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Received webhook event:', event.type)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)

  // TODO: Update user's subscription in database
  // This would typically:
  // 1. Find user by customer ID
  // 2. Update their subscription status
  // 3. Set plan permissions
  // 4. Reset usage counters if needed

  const customerEmail = await getCustomerEmail(subscription.customer as string)
  console.log(`New subscription for ${customerEmail}: ${subscription.id}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  // TODO: Update subscription details in database
  // Handle plan changes, cancellation scheduling, etc.

  const customerEmail = await getCustomerEmail(subscription.customer as string)
  console.log(`Subscription updated for ${customerEmail}: ${subscription.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  // TODO: Handle subscription cancellation
  // 1. Update user's plan to free tier
  // 2. Apply usage restrictions
  // 3. Send cancellation confirmation email

  const customerEmail = await getCustomerEmail(subscription.customer as string)
  console.log(`Subscription cancelled for ${customerEmail}: ${subscription.id}`)
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial ending soon:', subscription.id)

  // TODO: Send trial ending notification
  // 1. Find user by customer ID
  // 2. Send email reminder about trial ending
  // 3. Prompt for payment method if needed

  const customerEmail = await getCustomerEmail(subscription.customer as string)
  console.log(`Trial ending soon for ${customerEmail}: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id)

  // TODO: Handle successful payment
  // 1. Update payment history
  // 2. Reset usage counters for new billing period
  // 3. Send payment confirmation email

  if (invoice.customer) {
    const customerEmail = await getCustomerEmail(invoice.customer as string)
    console.log(`Payment succeeded for ${customerEmail}: ${invoice.amount_paid / 100}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id)

  // TODO: Handle failed payment
  // 1. Send payment failure notification
  // 2. Update subscription status if needed
  // 3. Apply grace period or restrictions

  if (invoice.customer) {
    const customerEmail = await getCustomerEmail(invoice.customer as string)
    console.log(`Payment failed for ${customerEmail}: ${invoice.amount_due / 100}`)
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('Customer created:', customer.id)

  // TODO: Link Stripe customer to user account
  // 1. Find user by email
  // 2. Store Stripe customer ID
  // 3. Set up default subscription if needed

  console.log(`New customer: ${customer.email}`)
}

async function getCustomerEmail(customerId: string): Promise<string> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return (customer as Stripe.Customer).email || 'unknown@example.com'
  } catch (error) {
    console.error('Error fetching customer:', error)
    return 'unknown@example.com'
  }
}