"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { categoryColors } from "@/lib/data/default-categories"

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
  disabled?: boolean
  className?: string
}

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleColorSelect = (color: string) => {
    onChange(color)
    setOpen(false)
  }

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
              <div
                className="w-6 h-6 rounded-sm border border-gray-200"
                style={{ backgroundColor: value }}
              />
            ) : (
              <span className="text-xs">Color</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Select a color</h4>
            <div className="grid grid-cols-6 gap-2">
              {categoryColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    "w-8 h-8 rounded-md border-2 relative hover:scale-110 transition-transform",
                    value === color
                      ? "border-gray-900 dark:border-gray-100"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {value === color && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {value && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: value }}
                  />
                  <span className="text-sm font-mono">{value}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}