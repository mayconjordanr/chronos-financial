'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['income', 'expense']),
  color: z.string().min(1, 'Cor é obrigatória'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
  isActive: z.boolean(),
  sortOrder: z.number().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  mode?: 'create' | 'edit'
  onSubmit: (data: CategoryFormData) => void
  onCancel?: () => void
  defaultValues?: Partial<CategoryFormData>
  isLoading?: boolean
}

export function CategoryForm({ mode = 'create', onSubmit, onCancel, defaultValues, isLoading }: CategoryFormProps) {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      type: defaultValues?.type || 'expense',
      color: defaultValues?.color || '#000000',
      icon: defaultValues?.icon || 'tag',
      isActive: defaultValues?.isActive ?? true,
      sortOrder: defaultValues?.sortOrder || 0,
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input {...form.register('name')} />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea {...form.register('description')} />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select {...form.register('type')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="color">Cor</Label>
        <Input type="color" {...form.register('color')} />
      </div>
      <div>
        <Label htmlFor="isActive">Ativa</Label>
        <Switch {...form.register('isActive')} />
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
