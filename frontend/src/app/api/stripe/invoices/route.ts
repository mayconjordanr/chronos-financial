import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  try {
    // TODO: Get customer ID from user session/auth
    // For now, using a mock approach to find customer
    const customerEmail = 'user@example.com'

    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length === 0) {
      return NextResponse.json([])
    }

    const customer = existingCustomers.data[0]

    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 10,
    })

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      created: new Date(invoice.created * 1000).toISOString(),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      pdfUrl: invoice.invoice_pdf,
    }))

    return NextResponse.json(formattedInvoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}