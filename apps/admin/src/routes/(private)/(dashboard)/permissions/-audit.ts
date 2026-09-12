/**
 * Audit Entry type for admin permission management.
 * Mirrors web app's -audit.ts exactly.
 */

export interface AdminAuditEntry {
  id: string
  type: 'grant' | 'revoke' | 'reset'
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  permission: {
    id: string
    key: string
    name: string
    description: string | null
    scope: string
    action: string
    resource: string
  }
  actionBy: string | null
  actionAt: Date | null
  reason: string | null
  actorName?: string
}
