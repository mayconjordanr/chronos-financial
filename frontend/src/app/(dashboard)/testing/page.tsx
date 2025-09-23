'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Webhook, TestTube } from 'lucide-react'

interface TestResult {
  success: boolean
  message: string
  details?: any
}

export default function TestingPage() {
  const [webhookSecret, setWebhookSecret] = useState('')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [isRunningAllTests, setIsRunningAllTests] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [allTestsResult, setAllTestsResult] = useState<any>(null)

  const eventTypes = [
    { value: 'subscriptionCreated', label: 'Subscription Created' },
    { value: 'subscriptionUpdated', label: 'Subscription Updated' },
    { value: 'trialWillEnd', label: 'Trial Will End' },
    { value: 'paymentSucceeded', label: 'Payment Succeeded' },
    { value: 'paymentFailed', label: 'Payment Failed' }
  ]

  const testSingleWebhook = async () => {
    if (!webhookSecret || !selectedEvent) {
      alert('Please enter webhook secret and select an event type')
      return
    }

    setIsTestingWebhook(true)
    try {
      const response = await fetch('/api/stripe/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: selectedEvent,
          webhookSecret
        })
      })

      const result: TestResult = await response.json()
      setTestResults(prev => ({ ...prev, [selectedEvent]: result }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [selectedEvent]: {
          success: false,
          message: 'Failed to test webhook',
          details: error
        }
      }))
    }
    setIsTestingWebhook(false)
  }

  const runAllTests = async () => {
    if (!webhookSecret) {
      alert('Please enter webhook secret')
      return
    }

    setIsRunningAllTests(true)
    try {
      const response = await fetch(`/api/stripe/test-webhook?secret=${encodeURIComponent(webhookSecret)}`)
      const result = await response.json()
      setAllTestsResult(result)
    } catch (error) {
      setAllTestsResult({
        error: 'Failed to run tests',
        details: error
      })
    }
    setIsRunningAllTests(false)
  }

  const getResultIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getResultBadge = (success: boolean) => {
    return (
      <Badge variant={success ? 'default' : 'destructive'} className="ml-2">
        {success ? 'PASS' : 'FAIL'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Testing Dashboard</h1>
        <p className="text-muted-foreground">
          Test Stripe webhooks and system integrations
        </p>
      </div>

      {/* Webhook Testing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <CardTitle>Stripe Webhook Testing</CardTitle>
          </div>
          <CardDescription>
            Test webhook signature verification and event processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={testSingleWebhook}
                  disabled={isTestingWebhook || !webhookSecret || !selectedEvent}
                  className="flex-1"
                >
                  {isTestingWebhook && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Single Event
                </Button>
                <Button
                  onClick={runAllTests}
                  disabled={isRunningAllTests || !webhookSecret}
                  variant="outline"
                >
                  {isRunningAllTests && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <TestTube className="h-4 w-4 mr-2" />
                  Run All Tests
                </Button>
              </div>
            </div>
          </div>

          {/* Single Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Individual Test Results</h4>
              {Object.entries(testResults).map(([eventType, result]) => (
                <Alert key={eventType}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getResultIcon(result)}
                      <span className="font-medium">{eventType}</span>
                      {getResultBadge(result.success)}
                    </div>
                  </div>
                  <AlertDescription className="mt-2">
                    {result.message}
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* All Tests Results */}
          {allTestsResult && (
            <div className="space-y-2">
              <h4 className="font-medium">Comprehensive Test Results</h4>
              {allTestsResult.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{allTestsResult.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{allTestsResult.summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{allTestsResult.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{allTestsResult.summary.success_rate}</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              )}

              {allTestsResult.results && (
                <div className="space-y-2">
                  {allTestsResult.results.map((testResult: any, index: number) => (
                    <Alert key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getResultIcon(testResult.result)}
                          <span className="font-medium">{testResult.test}</span>
                          {getResultBadge(testResult.result.success)}
                        </div>
                      </div>
                      <AlertDescription className="mt-2">
                        {testResult.result.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {allTestsResult.error && (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error: {allTestsResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            How to set up Stripe webhooks for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Run Setup Script</h4>
            <code className="block bg-muted p-2 rounded text-sm">
              node scripts/setup-stripe.js
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Configure Webhook Endpoint</h4>
            <p className="text-sm text-muted-foreground">
              Add this URL to your Stripe webhook endpoints:
            </p>
            <code className="block bg-muted p-2 rounded text-sm">
              http://localhost:3002/api/stripe/webhooks
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Events to Listen For</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <code className="bg-muted p-1 rounded">customer.subscription.created</code>
              <code className="bg-muted p-1 rounded">customer.subscription.updated</code>
              <code className="bg-muted p-1 rounded">customer.subscription.deleted</code>
              <code className="bg-muted p-1 rounded">customer.subscription.trial_will_end</code>
              <code className="bg-muted p-1 rounded">invoice.payment_succeeded</code>
              <code className="bg-muted p-1 rounded">invoice.payment_failed</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}