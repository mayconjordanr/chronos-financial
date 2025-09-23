'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  Send,
  Bot,
  BarChart3,
  Settings,
  Shield,
  Clock,
  Users,
  Zap,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppUser {
  id: string
  phoneNumber: string
  whatsappNumber: string
  isVerified: boolean
  createdAt: string
  lastActive: string
  messageCount: number
}

interface WhatsAppMessage {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  intent?: string
  processedAt?: string
  responseSent: boolean
  createdAt: string
}

interface WhatsAppStats {
  totalUsers: number
  verifiedUsers: number
  messagesLastWeek: number
  successfulCommands: number
  averageResponseTime: number
}

export default function WhatsAppIntegrationPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [whatsappUser, setWhatsappUser] = useState<WhatsAppUser | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [settings, setSettings] = useState({
    autoResponses: true,
    transactionConfirmations: true,
    dailyReports: false,
    budgetAlerts: true,
    largeTransactionLimit: 500
  })

  // Mock data for development
  useEffect(() => {
    // Simulate loading user data
    setTimeout(() => {
      setWhatsappUser({
        id: '1',
        phoneNumber: '+1234567890',
        whatsappNumber: '+1234567890',
        isVerified: true,
        createdAt: '2024-01-15',
        lastActive: new Date().toISOString(),
        messageCount: 47
      })
      setIsConnected(true)

      setStats({
        totalUsers: 1,
        verifiedUsers: 1,
        messagesLastWeek: 23,
        successfulCommands: 19,
        averageResponseTime: 1.2
      })

      setMessages([
        {
          id: '1',
          direction: 'inbound',
          content: 'add expense 50 food',
          intent: 'add_expense',
          processedAt: new Date().toISOString(),
          responseSent: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
          id: '2',
          direction: 'outbound',
          content: '✅ Added $50.00 expense for Food from Checking Account. Balance: $1,250.00',
          responseSent: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
          id: '3',
          direction: 'inbound',
          content: 'balance',
          intent: 'check_balance',
          processedAt: new Date().toISOString(),
          responseSent: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: '4',
          direction: 'outbound',
          content: '💰 Your Balances:\n🏦 Checking: $1,250.00\n💳 Savings: $5,000.00\n📊 Total: $6,250.00',
          responseSent: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ])
    }, 1000)
  }, [])

  const handleLinkPhone = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number')
      return
    }

    setIsLinking(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Verification code sent! Check your WhatsApp.')
      setIsVerifying(true)
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsLinking(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.success('WhatsApp connected successfully!')
      setIsConnected(true)
      setIsVerifying(false)
    } catch (error) {
      toast.error('Invalid verification code')
    }
  }

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) {
      toast.error('Please enter a test message')
      return
    }

    setIsSending(true)
    try {
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.success('Test message sent successfully!')
      setTestMessage('')
    } catch (error) {
      toast.error('Failed to send test message')
    } finally {
      setIsSending(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsConnected(false)
      setWhatsappUser(null)
      toast.success('WhatsApp disconnected')
    } catch (error) {
      toast.error('Failed to disconnect WhatsApp')
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-green-500" />
          WhatsApp Integration
        </h1>
        <p className="text-muted-foreground">
          Manage your finances through WhatsApp with natural language commands.
        </p>
      </motion.div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            {isConnected ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'WhatsApp is active' : 'Setup required'}
            </p>
          </CardContent>
        </Card>

        {stats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages This Week</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.messagesLastWeek}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.successfulCommands} successful commands
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageResponseTime}s</div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Out of {stats.totalUsers} total
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          {!isConnected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Connect WhatsApp
                </CardTitle>
                <CardDescription>
                  Link your WhatsApp number to start managing finances via chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isVerifying ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your WhatsApp number with country code
                      </p>
                    </div>
                    <Button onClick={handleLinkPhone} disabled={isLinking} className="w-full">
                      {isLinking ? 'Sending...' : 'Send Verification Code'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Verification Code</Label>
                      <Input
                        id="code"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code sent to your WhatsApp
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleVerifyCode} className="flex-1">
                        Verify & Connect
                      </Button>
                      <Button onClick={() => setIsVerifying(false)} variant="outline">
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Connected Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {whatsappUser && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Phone Number</span>
                        <span className="font-mono">{whatsappUser.phoneNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="default">Verified</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Messages Sent</span>
                        <span>{whatsappUser.messageCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Active</span>
                        <span className="text-sm">
                          {new Date(whatsappUser.lastActive).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  <Button onClick={handleDisconnect} variant="destructive" className="w-full">
                    Disconnect WhatsApp
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Test Integration
                  </CardTitle>
                  <CardDescription>
                    Send a test message to verify the connection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testMessage">Test Message</Label>
                    <Input
                      id="testMessage"
                      placeholder="balance"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSendTestMessage} disabled={isSending} className="w-full">
                    {isSending ? 'Sending...' : 'Send Test Message'}
                  </Button>
                  
                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook`}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button onClick={copyWebhookUrl} size="sm" variant="outline">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use this URL in your Twilio WhatsApp configuration
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Messages
              </CardTitle>
              <CardDescription>
                View recent WhatsApp conversations and bot responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border ${
                      message.direction === 'inbound'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {message.direction === 'inbound' ? (
                            <Badge variant="secondary">User</Badge>
                          ) : (
                            <Badge variant="default">Bot</Badge>
                          )}
                          {message.intent && (
                            <Badge variant="outline">{message.intent}</Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                WhatsApp Preferences
              </CardTitle>
              <CardDescription>
                Customize your WhatsApp integration behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Responses</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoResponses}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoResponses: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Send confirmation messages for transactions
                    </p>
                  </div>
                  <Switch
                    checked={settings.transactionConfirmations}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, transactionConfirmations: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily spending summaries
                    </p>
                  </div>
                  <Switch
                    checked={settings.dailyReports}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, dailyReports: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    checked={settings.budgetAlerts}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, budgetAlerts: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Large Transaction Limit</Label>
                  <Input
                    type="number"
                    value={settings.largeTransactionLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, largeTransactionLimit: parseInt(e.target.value) }))}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Require confirmation for transactions above this amount
                  </p>
                </div>
              </div>

              <Button className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Supported Commands
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">Add Expenses</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      "add expense 50 food"<br />
                      "spent 25 on gas"<br />
                      "bought coffee for 5"
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Add Income</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      "income 5000 salary"<br />
                      "received 100 freelance"<br />
                      "got paid 3000"
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Check Balance</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      "balance"<br />
                      "how much do I have?"<br />
                      "account balances"
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Reports</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      "expenses this month"<br />
                      "spending in food"<br />
                      "budget status"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">End-to-End Encryption</p>
                      <p className="text-xs text-muted-foreground">
                        All WhatsApp messages are encrypted
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Tenant Isolation</p>
                      <p className="text-xs text-muted-foreground">
                        Your data is isolated from other users
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Rate Limiting</p>
                      <p className="text-xs text-muted-foreground">
                        Protection against message spam
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Large Transactions</p>
                      <p className="text-xs text-muted-foreground">
                        Confirmation required for amounts over ${settings.largeTransactionLimit}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Connect Your Phone</p>
                    <p className="text-xs text-muted-foreground">
                      Enter your WhatsApp number and verify with the code sent to you
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start Chatting</p>
                    <p className="text-xs text-muted-foreground">
                      Send messages like "balance" or "add expense 50 food" to manage your finances
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Configure Settings</p>
                    <p className="text-xs text-muted-foreground">
                      Customize notifications and preferences in the Settings tab
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}