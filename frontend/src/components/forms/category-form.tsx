"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/color-picker"
import { IconPicker } from "@/components/ui/icon-picker"
import {
  createCategorySchema,
  updateCategorySchema,
  type Category,
  type CreateCategory,
  type UpdateCategory,
} from "@/lib/schemas/category"
import { categoryColors } from "@/lib/data/default-categories"

interface CategoryFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<Category>
  onSubmit: (data: CreateCategory | UpdateCategory) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function CategoryForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const schema = mode === "create" ? createCategorySchema : updateCategorySchema

  const form = useForm<CreateCategory | UpdateCategory>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      description: "",
      color: categoryColors[0],
      icon: "",
      type: "expense",
      isActive: true,
      ...defaultValues,
    },
  })

  const watchedColor = form.watch("color")
  const watchedIcon = form.watch("icon")
  const watchedType = form.watch("type")

  const handleSubmit = async (data: CreateCategory | UpdateCategory) => {
    try {
      await onSubmit(data)
      if (mode === "create") {
        form.reset()
      }
    } catch (error) {
      console.error("Failed to save category:", error)
    }
  }

  const resetForm = () => {
    form.reset()
    onCancel?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Category Preview */}
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            {watchedIcon && (
              <IconPicker
                value={watchedIcon}
                onChange={() => {}}
                disabled
                color={watchedColor}
                className="pointer-events-none"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {form.watch("name") || "Category Name"}
                </span>
                <Badge variant={watchedType === "income" ? "default" : "secondary"}>
                  {watchedType}
                </Badge>
              </div>
              {form.watch("description") && (
                <p className="text-sm text-muted-foreground mt-1">
                  {form.watch("description")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Food & Dining, Transportation"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Give your category a clear, descriptive name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of what this category includes..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Add a description to help clarify what belongs in this category.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Visual Customization */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Visual Customization</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a color to represent this category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <IconPicker
                      value={field.value}
                      onChange={field.onChange}
                      color={watchedColor}
                    />
                  </FormControl>
                  <FormDescription>
                    Select an icon that represents this category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Category Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Type</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => field.onChange("expense")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      field.value === "expense"
                        ? "border-red-500 bg-red-50 dark:bg-red-950"
                        : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium text-red-600">Expense</div>
                      <div className="text-sm text-muted-foreground">
                        Money going out
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("income")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      field.value === "income"
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium text-green-600">Income</div>
                      <div className="text-sm text-muted-foreground">
                        Money coming in
                      </div>
                    </div>
                  </button>
                </div>
              </FormControl>
              <FormDescription>
                Select whether this category is for income or expenses.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Status */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Category</FormLabel>
                <FormDescription>
                  Active categories appear in transaction forms and reports.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creating..." : "Updating..."}
              </>
            ) : (
              mode === "create" ? "Create Category" : "Update Category"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}