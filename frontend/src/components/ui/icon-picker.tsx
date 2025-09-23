"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { financialIcons, getAllIcons, searchIcons } from "@/lib/data/default-categories"

interface IconPickerProps {
  value?: string
  onChange: (icon: string) => void
  disabled?: boolean
  className?: string
  color?: string
}

export function IconPicker({
  value,
  onChange,
  disabled = false,
  className,
  color = "#6b7280",
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")

  // Get the icon component dynamically
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName]
    return IconComponent || LucideIcons.Circle
  }

  // Filter icons based on search and category
  const filteredIcons = React.useMemo(() => {
    let icons = getAllIcons()

    if (searchQuery) {
      icons = searchIcons(searchQuery)
    } else if (selectedCategory !== "all") {
      icons = icons.filter(icon =>
        icon.category.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    return icons
  }, [searchQuery, selectedCategory])

  // Get unique categories
  const categories = React.useMemo(() => {
    const allIcons = getAllIcons()
    const uniqueCategories = Array.from(new Set(allIcons.map(icon => icon.category)))
    return ["all", ...uniqueCategories.sort()]
  }, [])

  const handleIconSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
    setSearchQuery("")
    setSelectedCategory("all")
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSelectedCategory("all")
  }

  const SelectedIcon = value ? getIconComponent(value) : LucideIcons.Circle

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[60px] h-10 p-1 border-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="w-full h-full rounded-sm flex items-center justify-center">
            {value ? (
              <SelectedIcon
                className="h-5 w-5"
                style={{ color: color }}
              />
            ) : (
              <span className="text-xs">Icon</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Select an icon</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <div className="px-4 py-2 border-b">
            <ScrollArea className="w-full">
              <TabsList className="grid w-max grid-flow-col auto-cols-max gap-1">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-xs capitalize whitespace-nowrap"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <div className="h-64">
            <ScrollArea className="h-full">
              <div className="p-4">
                {filteredIcons.length > 0 ? (
                  <div className="grid grid-cols-6 gap-2">
                    {filteredIcons.map((icon) => {
                      const IconComponent = getIconComponent(icon.name)
                      const isSelected = value === icon.name

                      return (
                        <button
                          key={icon.name}
                          onClick={() => handleIconSelect(icon.name)}
                          className={cn(
                            "w-10 h-10 rounded-md border-2 flex items-center justify-center hover:bg-accent transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-border/60"
                          )}
                          title={`${icon.name} - ${icon.category}`}
                        >
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: isSelected ? color : undefined }}
                          />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LucideIcons.Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No icons found
                    </p>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>

        {value && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Selected:</span>
              <div className="flex items-center gap-2">
                <SelectedIcon
                  className="h-4 w-4"
                  style={{ color: color }}
                />
                <span className="text-sm font-mono">{value}</span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}