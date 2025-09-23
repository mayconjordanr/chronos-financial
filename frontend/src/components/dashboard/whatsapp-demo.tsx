'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Bot,
  User,
  CheckCircle,
  ExternalLink,
  Smartphone
} from 'lucide-react'
import Link from 'next/link'

interface DemoMessage {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: string
}

export function WhatsAppDemo() {
  const [currentDemo, setCurrentDemo] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [messages, setMessages] = useState<DemoMessage[]>([])

  const demoScenarios = [
    {
      title: 'Add Expense',
      description: 'Track spending with natural language',
      messages: [
        { id: '1', type: 'user' as const, content: 'add expense 50 food', timestamp: '2:30 PM' },
        { id: '2', type: 'bot' as const, content: '✅ Added $50.00 expense for Food from Checking Account. Balance: $1,250.00', timestamp: '2:30 PM' }
      ]
    },
    {
      title: 'Check Balance',
      description: 'Get instant balance updates',
      messages: [
        { id: '1', type: 'user' as const, content: 'balance', timestamp: '3:15 PM' },
        { id: '2', type: 'bot' as const, content: '💰 Your Balances:\n🏦 Checking: $1,200.00\n💳 Savings: $5,000.00\n📊 Total: $6,200.00', timestamp: '3:15 PM' }
      ]
    },
    {
      title: 'Monthly Report',
      description: 'View spending summaries',
      messages: [
        { id: '1', type: 'user' as const, content: 'expenses this month', timestamp: '4:45 PM' },
        { id: '2', type: 'bot' as const, content: '📊 December Expenses:\n🍕 Food: $450.00\n⛽ Transportation: $200.00\n🏠 Bills: $800.00\n💰 Total: $1,450.00', timestamp: '4:45 PM' }
      ]
    }
  ]

  const playDemo = async (scenarioIndex: number) => {
    setCurrentDemo(scenarioIndex)
    setIsPlaying(true)
    setMessages([])

    const scenario = demoScenarios[scenarioIndex]
    
    for (let i = 0; i < scenario.messages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 1500))
      setMessages(prev => [...prev, scenario.messages[i]])
    }
    
    setIsPlaying(false)
  }

  const currentScenario = demoScenarios[currentDemo]

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle>WhatsApp Integration</CardTitle>
          </div>
          <Link href="/whatsapp">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Setup
            </Button>
          </Link>
        </div>
        <CardDescription>
          Manage your finances through WhatsApp with natural language commands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo Selector */}
        <div className="flex gap-2 flex-wrap">
          {demoScenarios.map((scenario, index) => (
            <Button
              key={index}
              onClick={() => playDemo(index)}
              size="sm"
              variant={currentDemo === index ? "default" : "outline"}
              disabled={isPlaying}
              className="text-xs"
            >
              {scenario.title}
            </Button>
          ))}
        </div>

        {/* Phone Mockup */}
        <div className="mx-auto max-w-sm">
          <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
            <div className="bg-white rounded-2xl overflow-hidden">
              {/* Phone Header */}
              <div className="bg-green-500 text-white p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">CHRONOS Finance Bot</div>
                    <div className="text-xs opacity-90">Online</div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto p-3 bg-gray-50 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center space-y-2">
                      <Smartphone className="h-8 w-8 mx-auto opacity-50" />
                      <p className="text-sm">Select a demo scenario above</p>
                      <p className="text-xs opacity-75">{currentScenario.description}</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs p-2 rounded-lg text-sm ${
                            message.type === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.type === 'bot' && (
                              <Bot className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <div className="text-xs opacity-70 mt-1">
                                {message.timestamp}
                                {message.type === 'bot' && (
                                  <CheckCircle className="h-3 w-3 inline ml-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border shadow-sm rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500">Bot is typing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-sm text-gray-500">
                    Type a message...
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10l8-8 8 8-1.5 1.5L11 6v12H9V6l-5.5 5.5L2 10z" transform="rotate(45 10 10)" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Natural Language</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Instant Responses</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Transaction Tracking</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Balance Queries</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          <Link href="/whatsapp">
            <Button className="w-full">
              Setup WhatsApp Integration
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}