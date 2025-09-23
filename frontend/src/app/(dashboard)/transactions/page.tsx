import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export const metadata = {
  title: 'Transactions | Chronos Financial',
  description: 'Manage your financial transactions',
}

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Track and manage all your financial transactions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            A list of your recent financial transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Transaction table will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-1">
              This will include filtering, sorting, and pagination
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}