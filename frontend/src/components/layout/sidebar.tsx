'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Receipt,
  Tags,
  Settings,
  LogOut,
  Menu,
  Zap,
  MessageSquare,
  TestTube,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/hooks/use-auth'
import { useIsMobile } from '@/hooks/use-mobile'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: Receipt,
  },
  {
    name: 'Accounts',
    href: '/accounts',
    icon: Wallet,
  },
  {
    name: 'Cards',
    href: '/cards',
    icon: CreditCard,
  },
  {
    name: 'Categories',
    href: '/categories',
    icon: Tags,
  },
  {
    name: 'WhatsApp',
    href: '/whatsapp',
    icon: MessageSquare,
  },
  {
    name: 'Test Sync',
    href: '/test-sync',
    icon: Zap,
  },
  {
    name: 'Testing',
    href: '/testing',
    icon: TestTube,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarContentProps {
  className?: string
}

function SidebarContent({ className }: SidebarContentProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className={cn('flex h-full flex-col bg-card', className)}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-lg">Chronos</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
      <SidebarContent />
    </aside>
  )
}