"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  GripVertical,
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Category, CategoryFilter } from "@/lib/schemas/category"
import { defaultCategories } from "@/lib/data/default-categories"

interface CategoryListProps {
  categories?: Category[]
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  onCreate: () => void
  onReorder?: (categoryIds: string[]) => void
  isLoading?: boolean
}

export function CategoryList({
  categories = defaultCategories as Category[],
  onEdit,
  onDelete,
  onCreate,
  onReorder,
  isLoading = false,
}: CategoryListProps) {
  const [filter, setFilter] = React.useState<CategoryFilter>({
    type: "all",
    search: "",
    sortBy: "name",
    sortOrder: "asc",
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null)

  // Get icon component dynamically
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName]
    return IconComponent || LucideIcons.Circle
  }

  // Filter and sort categories
  const filteredCategories = React.useMemo(() => {
    let filtered = [...categories]

    // Filter by search
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      filtered = filtered.filter(
        (category) =>
          category.name.toLowerCase().includes(searchLower) ||
          category.description?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by type
    if (filter.type !== "all") {
      filtered = filtered.filter((category) => category.type === filter.type)
    }

    // Sort categories
    filtered.sort((a, b) => {
      let comparison = 0

      switch (filter.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
        case "createdAt":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          break
        case "usage":
          // For demo purposes, we'll sort by name as we don't have usage data
          comparison = a.name.localeCompare(b.name)
          break
        default:
          comparison = 0
      }

      return filter.sortOrder === "desc" ? -comparison : comparison
    })

    return filtered
  }, [categories, filter])

  // Separate categories by type
  const incomeCategories = filteredCategories.filter(cat => cat.type === "income")
  const expenseCategories = filteredCategories.filter(cat => cat.type === "expense")

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (categoryToDelete) {
      onDelete(categoryToDelete.id!)
      setCategoryToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const CategoryCard = ({ category, index }: { category: Category; index: number }) => {
    const IconComponent = getIconComponent(category.icon)

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Card className="h-full transition-all duration-200 hover:shadow-md border-l-4" style={{ borderLeftColor: category.color }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category.color}15` }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: category.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm truncate">{category.name}</h3>
                  <Badge
                    variant={category.type === "income" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {category.type}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(category)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {category.isActive ? "Active" : "Inactive"}
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const EmptyState = ({ type }: { type?: "income" | "expense" }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-2">
        No {type ? `${type} ` : ""}categories found
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {filter.search
          ? "Try adjusting your search or filters"
          : `Create your first ${type || ""} category to get started`
        }
      </p>
      <Button onClick={onCreate} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <Select
            value={filter.sortBy}
            onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value as any }))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter(prev => ({
              ...prev,
              sortOrder: prev.sortOrder === "asc" ? "desc" : "asc"
            }))}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={filter.type}
        onValueChange={(value) => setFilter(prev => ({ ...prev, type: value as any }))}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Categories ({filteredCategories.length})</TabsTrigger>
          <TabsTrigger value="income">Income ({incomeCategories.length})</TabsTrigger>
          <TabsTrigger value="expense">Expense ({expenseCategories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredCategories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredCategories.map((category, index) => (
                  <CategoryCard
                    key={category.id || category.name}
                    category={category}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          {incomeCategories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {incomeCategories.map((category, index) => (
                  <CategoryCard
                    key={category.id || category.name}
                    category={category}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState type="income" />
          )}
        </TabsContent>

        <TabsContent value="expense" className="space-y-4">
          {expenseCategories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {expenseCategories.map((category, index) => (
                  <CategoryCard
                    key={category.id || category.name}
                    category={category}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState type="expense" />
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
              {/* Note: Add info about existing transactions using this category */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}