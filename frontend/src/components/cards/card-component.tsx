'use client'

import { motion } from 'framer-motion'
import { CreditCard, RectangleHorizontal, Wifi } from 'lucide-react'
import { Card } from '@/lib/schemas/card'
import { getCardNetworkConfig, getNetworkBackgroundClasses } from '@/lib/data/card-networks'
import { maskCardNumber, formatExpiryDate, isCardExpiringSoon } from '@/lib/utils/card-utils'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CardComponentProps {
  card: Card
  size?: 'small' | 'medium' | 'large'
  interactive?: boolean
  showDetails?: boolean
  className?: string
  onClick?: () => void
}

export function CardComponent({
  card,
  size = 'medium',
  interactive = true,
  showDetails = true,
  className,
  onClick,
}: CardComponentProps) {
  const networkConfig = getCardNetworkConfig(card.network)
  const isExpiringSoon = isCardExpiringSoon(card.expiryDate)

  const sizeClasses = {
    small: 'w-64 h-40',
    medium: 'w-80 h-48',
    large: 'w-96 h-60',
  }

  const cardVariants = {
    initial: { rotateY: 0, scale: 1 },
    hover: {
      rotateY: 5,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  }

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer perspective-1000',
        interactive && 'hover:z-10',
        className
      )}
      variants={interactive ? cardVariants : undefined}
      initial="initial"
      whileHover={interactive ? 'hover' : undefined}
      whileTap={interactive ? 'tap' : undefined}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative rounded-2xl shadow-lg overflow-hidden',
          'transform-gpu transition-shadow duration-300',
          interactive && 'hover:shadow-2xl',
          sizeClasses[size],
          getNetworkBackgroundClasses(card.network)
        )}
        style={{
          background: networkConfig.colors.gradient,
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20" />
          <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Card Content */}
        <div className="relative h-full p-6 flex flex-col justify-between text-white">
          {/* Top Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <RectangleHorizontal className="w-8 h-6 text-yellow-300" />
              <Wifi className="w-5 h-5 text-white/70" />
            </div>
            <div className="flex flex-col items-end gap-1">
              {card.isPrimary && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Primary
                </Badge>
              )}
              {isExpiringSoon && (
                <Badge variant="destructive" className="bg-red-500/80 text-white">
                  Expires Soon
                </Badge>
              )}
              {!card.isActive && (
                <Badge variant="outline" className="bg-gray-500/80 text-white border-gray-300">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          {/* Card Number */}
          <div className="space-y-1">
            <div className="font-mono text-xl tracking-wider font-medium">
              {maskCardNumber(card.last4digits)}
            </div>
            {showDetails && (
              <div className="text-xs text-white/70 uppercase tracking-wide">
                {card.type} card
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium truncate max-w-[200px]">
                {card.name}
              </div>
              {showDetails && (
                <div className="text-xs text-white/70">
                  {card.bank}
                </div>
              )}
            </div>

            <div className="text-right space-y-1">
              <div className="text-sm font-medium">
                {formatExpiryDate(card.expiryDate)}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold tracking-wider">
                  {networkConfig.displayName.toUpperCase()}
                </div>
                <CreditCard className="w-6 h-4" />
              </div>
            </div>
          </div>

          {/* Credit Limit (for credit cards) */}
          {card.type === 'credit' && card.creditLimit && showDetails && (
            <div className="absolute top-6 left-6 text-xs text-white/70">
              Limit: ${card.creditLimit.toLocaleString()}
            </div>
          )}
        </div>

        {/* Shine Effect */}
        {interactive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
        )}
      </div>
    </motion.div>
  )
}

// Compact card view for lists
export function CompactCardComponent({
  card,
  onClick,
  className,
}: {
  card: Card
  onClick?: () => void
  className?: string
}) {
  const networkConfig = getCardNetworkConfig(card.network)

  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors',
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      {/* Network Indicator */}
      <div
        className={cn(
          'w-12 h-8 rounded flex items-center justify-center',
          getNetworkBackgroundClasses(card.network)
        )}
      >
        <CreditCard className="w-4 h-4 text-white" />
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{card.name}</h3>
          {card.isPrimary && (
            <Badge variant="secondary" className="text-xs">
              Primary
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">•••• {card.last4digits}</span>
          <span>•</span>
          <span className="capitalize">{card.network}</span>
          <span>•</span>
          <span className="capitalize">{card.type}</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-right">
        <div className="text-sm font-medium">
          {formatExpiryDate(card.expiryDate)}
        </div>
        <div className="text-xs text-muted-foreground">
          {card.bank}
        </div>
      </div>
    </motion.div>
  )
}

// Card skeleton for loading states
export function CardSkeleton({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-64 h-40',
    medium: 'w-80 h-48',
    large: 'w-96 h-60',
  }

  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse',
        sizeClasses[size]
      )}
    >
      <div className="h-full p-6 flex flex-col justify-between">
        <div className="flex justify-between">
          <div className="w-8 h-6 bg-gray-400 rounded" />
          <div className="w-16 h-4 bg-gray-400 rounded" />
        </div>

        <div className="space-y-2">
          <div className="w-full h-6 bg-gray-400 rounded" />
          <div className="w-20 h-3 bg-gray-400 rounded" />
        </div>

        <div className="flex justify-between">
          <div className="space-y-1">
            <div className="w-24 h-4 bg-gray-400 rounded" />
            <div className="w-16 h-3 bg-gray-400 rounded" />
          </div>
          <div className="space-y-1">
            <div className="w-12 h-4 bg-gray-400 rounded" />
            <div className="w-16 h-3 bg-gray-400 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}