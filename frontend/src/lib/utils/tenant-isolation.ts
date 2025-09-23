'use client'

// Tenant isolation utilities for real-time events

export interface TenantContext {
  tenantId: string
  userId: string
  permissions: string[]
  isOwner: boolean
}

export interface TenantIsolatedEvent {
  tenantId: string
  userId: string
  type: string
  entity: string
  data: any
  timestamp: number
  permissions?: string[]
}

export class TenantIsolationService {
  private currentTenant: TenantContext | null = null

  // Set current tenant context
  setTenantContext(context: TenantContext) {
    this.currentTenant = context
  }

  // Get current tenant context
  getCurrentTenant(): TenantContext | null {
    return this.currentTenant
  }

  // Check if user has access to specific tenant
  hasAccessToTenant(tenantId: string): boolean {
    return this.currentTenant?.tenantId === tenantId
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    if (!this.currentTenant) return false
    return this.currentTenant.isOwner || this.currentTenant.permissions.includes(permission)
  }

  // Validate event access
  canAccessEvent(event: TenantIsolatedEvent): boolean {
    // Check tenant access
    if (!this.hasAccessToTenant(event.tenantId)) {
      return false
    }

    // Check permissions if event has specific permission requirements
    if (event.permissions && event.permissions.length > 0) {
      return event.permissions.some(permission => this.hasPermission(permission))
    }

    return true
  }

  // Filter events for current tenant
  filterEvents(events: TenantIsolatedEvent[]): TenantIsolatedEvent[] {
    return events.filter(event => this.canAccessEvent(event))
  }

  // Create tenant-isolated event
  createTenantEvent(
    type: string,
    entity: string,
    data: any,
    permissions?: string[]
  ): TenantIsolatedEvent | null {
    if (!this.currentTenant) {
      console.error('Cannot create tenant event: No tenant context set')
      return null
    }

    return {
      tenantId: this.currentTenant.tenantId,
      userId: this.currentTenant.userId,
      type,
      entity,
      data,
      timestamp: Date.now(),
      permissions
    }
  }

  // Validate WebSocket channel access
  validateChannelAccess(channel: string): boolean {
    if (!this.currentTenant) return false

    // Parse channel format: tenant:{tenantId}:entity:{entityType}
    const channelParts = channel.split(':')
    if (channelParts.length >= 2 && channelParts[0] === 'tenant') {
      const channelTenantId = channelParts[1]
      return this.hasAccessToTenant(channelTenantId)
    }

    // Allow global channels if user has admin permissions
    if (channel.startsWith('global:')) {
      return this.hasPermission('admin')
    }

    return false
  }

  // Generate tenant-specific channel names
  getTenantChannel(entity: string): string {
    if (!this.currentTenant) {
      throw new Error('No tenant context available')
    }
    return `tenant:${this.currentTenant.tenantId}:entity:${entity}`
  }

  // Generate user-specific channel names
  getUserChannel(entity: string): string {
    if (!this.currentTenant) {
      throw new Error('No tenant context available')
    }
    return `user:${this.currentTenant.userId}:entity:${entity}`
  }

  // Get all allowed channels for current user
  getAllowedChannels(): string[] {
    if (!this.currentTenant) return []

    const channels: string[] = []

    // Tenant-specific channels
    const entities = ['transaction', 'account', 'card', 'category']
    entities.forEach(entity => {
      channels.push(this.getTenantChannel(entity))
    })

    // User-specific channels
    channels.push(this.getUserChannel('notification'))
    channels.push(this.getUserChannel('presence'))

    // Global channels for admins
    if (this.hasPermission('admin')) {
      channels.push('global:system')
      channels.push('global:announcements')
    }

    return channels
  }

  // Sanitize data for tenant isolation
  sanitizeEventData(data: any): any {
    if (!this.currentTenant) return null

    // Remove sensitive fields that shouldn't be shared across tenants
    const sanitized = { ...data }
    
    // Remove internal IDs and sensitive data
    delete sanitized.internal_id
    delete sanitized.raw_data
    delete sanitized.sensitive_info

    // Ensure tenant_id matches current tenant
    if (sanitized.tenant_id && sanitized.tenant_id !== this.currentTenant.tenantId) {
      console.warn('Tenant ID mismatch in event data')
      return null
    }

    // Ensure user has access to user-specific data
    if (sanitized.user_id && !this.hasPermission('admin')) {
      if (sanitized.user_id !== this.currentTenant.userId) {
        // Remove user-specific fields for other users
        delete sanitized.user_id
        delete sanitized.personal_data
      }
    }

    return sanitized
  }

  // Audit log for security tracking
  auditEventAccess(
    event: TenantIsolatedEvent,
    action: 'allowed' | 'denied',
    reason?: string
  ) {
    const auditEntry = {
      timestamp: Date.now(),
      tenantId: this.currentTenant?.tenantId,
      userId: this.currentTenant?.userId,
      eventType: event.type,
      eventEntity: event.entity,
      action,
      reason,
      eventTenantId: event.tenantId
    }

    // In production, this would send to audit logging service
    // Audit entry logged
  }
}

// Singleton instance
export const tenantIsolation = new TenantIsolationService()

// Hook for tenant context
export function useTenantIsolation() {
  const setTenantContext = (context: TenantContext) => {
    tenantIsolation.setTenantContext(context)
  }

  const getCurrentTenant = () => {
    return tenantIsolation.getCurrentTenant()
  }

  const hasPermission = (permission: string) => {
    return tenantIsolation.hasPermission(permission)
  }

  const canAccessEvent = (event: TenantIsolatedEvent) => {
    const canAccess = tenantIsolation.canAccessEvent(event)
    
    // Audit the access attempt
    tenantIsolation.auditEventAccess(
      event,
      canAccess ? 'allowed' : 'denied',
      canAccess ? undefined : 'Insufficient permissions or tenant mismatch'
    )
    
    return canAccess
  }

  const getTenantChannel = (entity: string) => {
    return tenantIsolation.getTenantChannel(entity)
  }

  const getAllowedChannels = () => {
    return tenantIsolation.getAllowedChannels()
  }

  const sanitizeEventData = (data: any) => {
    return tenantIsolation.sanitizeEventData(data)
  }

  return {
    setTenantContext,
    getCurrentTenant,
    hasPermission,
    canAccessEvent,
    getTenantChannel,
    getAllowedChannels,
    sanitizeEventData
  }
}

// Real-time event filtering middleware
export function createTenantEventFilter() {
  return (event: TenantIsolatedEvent): TenantIsolatedEvent | null => {
    // Check if user can access this event
    if (!tenantIsolation.canAccessEvent(event)) {
      tenantIsolation.auditEventAccess(event, 'denied', 'Access check failed')
      return null
    }

    // Sanitize event data
    const sanitizedData = tenantIsolation.sanitizeEventData(event.data)
    if (!sanitizedData) {
      tenantIsolation.auditEventAccess(event, 'denied', 'Data sanitization failed')
      return null
    }

    // Return filtered event
    return {
      ...event,
      data: sanitizedData
    }
  }
}

// Mock data for development
export const mockTenantContext: TenantContext = {
  tenantId: 'tenant-123',
  userId: 'user-456',
  permissions: ['read:transactions', 'write:transactions', 'read:accounts', 'write:accounts'],
  isOwner: false
}

export const mockAdminContext: TenantContext = {
  tenantId: 'tenant-123',
  userId: 'admin-789',
  permissions: ['admin'],
  isOwner: true
}