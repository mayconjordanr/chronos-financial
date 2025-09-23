'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
  Plus,
  CreditCard,
  Building2,
  ArrowUpDown,
  PieChart,
  Settings,
  Download,
  Upload
} from "lucide-react"

interface QuickActionsProps {
  onAddTransaction?: () => void
  onAddAccount?: () => void
  onAddCard?: () => void
  onTransfer?: () => void
  onExport?: () => void
  onImport?: () => void
}

export function QuickActions({
  onAddTransaction,
  onAddAccount,
  onAddCard,
  onTransfer,
  onExport,
  onImport
}: QuickActionsProps) {
  const actions = [
    {
      title: "Add Transaction",
      description: "Record income or expense",
      icon: Plus,
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: onAddTransaction
    },
    {
      title: "Add Account",
      description: "Connect bank account",
      icon: Building2,
      color: "bg-green-500 hover:bg-green-600",
      onClick: onAddAccount
    },
    {
      title: "Add Card",
      description: "Add credit/debit card",
      icon: CreditCard,
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: onAddCard
    },
    {
      title: "Transfer Money",
      description: "Between accounts",
      icon: ArrowUpDown,
      color: "bg-orange-500 hover:bg-orange-600",
      onClick: onTransfer
    },
    {
      title: "Export Data",
      description: "Download reports",
      icon: Download,
      color: "bg-gray-500 hover:bg-gray-600",
      onClick: onExport
    },
    {
      title: "Import Data",
      description: "Upload transactions",
      icon: Upload,
      color: "bg-indigo-500 hover:bg-indigo-600",
      onClick: onImport
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2 w-full hover:scale-105 transition-transform"
                  onClick={action.onClick}
                >
                  <div className={`p-2 rounded-md text-white ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}