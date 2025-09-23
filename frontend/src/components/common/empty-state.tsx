import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title = "No data available",
  description = "There's nothing to show here yet.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed border-2", className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        {icon && (
          <div className="w-12 h-12 text-muted-foreground mb-4">
            {icon}
          </div>
        )}

        <h3 className="text-lg font-medium mb-2">{title}</h3>

        <p className="text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>

        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}