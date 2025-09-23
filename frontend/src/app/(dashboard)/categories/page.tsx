"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Plus, TrendingUp, TrendingDown, Tag } from "lucide-react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryList } from '@/components/categories/category-list'
import { CategoryDialog } from '@/components/dialogs/category-dialog'
import { Category } from '@/lib/schemas/category'
import { defaultCategories } from '@/lib/data/default-categories'
import { toast } from 'sonner'


export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>(
    defaultCategories.map((cat, index) => ({
      ...cat,
      id: `cat_${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  )
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create')
  const [selectedCategory, setSelectedCategory] = React.useState<Category | undefined>()

  // Category statistics
  const stats = React.useMemo(() => {
    const total = categories.length
    const income = categories.filter(cat => cat.type === 'income').length
    const expense = categories.filter(cat => cat.type === 'expense').length
    const active = categories.filter(cat => cat.isActive).length

    return { total, income, expense, active }
  }, [categories])

  const handleCreateCategory = () => {
    setDialogMode('create')
    setSelectedCategory(undefined)
    setDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setDialogMode('edit')
    setSelectedCategory(category)
    setDialogOpen(true)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      setCategories(prev => prev.filter(cat => cat.id !== categoryId))
      toast.success('Category deleted successfully!')
    } catch {
      toast.error('Failed to delete category. Please try again.')
    }
  }

  const handleCategorySuccess = (category: Category) => {
    if (dialogMode === 'create') {
      setCategories(prev => [...prev, category])
    } else {
      setCategories(prev => prev.map(cat =>
        cat.id === category.id ? category : cat
      ))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Organize your transactions with custom categories
          </p>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income Categories</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.income}</div>
            <p className="text-xs text-muted-foreground">
              Money coming in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expense Categories</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expense}</div>
            <p className="text-xs text-muted-foreground">
              Money going out
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleCreateCategory}>
          <CardContent className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Add Category</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category List */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
          <CardDescription>
            Create, edit, and organize your transaction categories. Use the tabs to filter by type or view all categories at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryList
            categories={categories}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onCreate={handleCreateCategory}
          />
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        category={selectedCategory}
        onSuccess={handleCategorySuccess}
      />
    </motion.div>
  )
}