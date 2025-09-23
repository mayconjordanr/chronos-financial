'use client'

import { Sidebar } from './sidebar'
import { ThemeToggle } from './theme-toggle'
import { UserNav } from './user-nav'
import { useIsMobile } from '@/hooks/use-mobile'

export function Header() {
  const isMobile = useIsMobile()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {isMobile && (
          <div className="mr-4">
            <Sidebar />
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}