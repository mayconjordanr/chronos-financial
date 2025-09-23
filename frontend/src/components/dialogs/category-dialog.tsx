"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CategoryForm } from "@/components/forms/category-form"
import { Category, CreateCategory, UpdateCategory } from "@/lib/schemas/category"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  category?: Category
  onSuccess?: (category: Category) => void
}

export function CategoryDialog({
  open,
  onOpenChange,
  mode,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (data: CreateCategory | UpdateCategory) => {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (mode === "create") {
        // Create new category
        const newCategory: Category = {
          ...data as CreateCategory,
          id: `cat_${Date.now()}`, // Generate temporary ID
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        toast.success("Category created successfully!")
        onSuccess?.(newCategory)
      } else {
        // Update existing category
        const updatedCategory: Category = {
          ...category!,
          ...data as UpdateCategory,
          updatedAt: new Date(),
        }

        toast.success("Category updated successfully!")
        onSuccess?.(updatedCategory)
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save category:", error)
      toast.error(
        mode === "create"
          ? "Failed to create category. Please try again."
          : "Failed to update category. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new category to organize your transactions. Choose an icon, color, and type to make it easy to identify."
              : "Update your category details. Changes will be applied to future transactions using this category."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <CategoryForm
            mode={mode}
            defaultValues={category}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}