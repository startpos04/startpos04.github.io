/**
 * CreateAccountSidebar
 *
 * Form to create a new AdminUser account.
 * Mirrors web's CreateEmployeeSidebar.
 */

import { PasswordInputRaw } from '@platform/components/custom/form/password-input'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { createFileRoute } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createAdminUser } from '@/lib/server-fn/admin-accounts'
import { closeAccountSidebar } from '../-components/account-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/accounts/create/' as never)({
  component: () => <CreateAccountSidebar />,
})

interface Props {
  onClose?: () => void
  onCreated?: () => void
}

const ROLES = ['SUPERADMIN', 'TESTER', 'SUPPORT', 'FINANCE', 'DEVELOPER'] as const

export function CreateAccountSidebar({ onClose, onCreated }: Props) {
  const handleClose = onClose ?? closeAccountSidebar

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('TESTER')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) return

    setSubmitting(true)
    try {
      const result = await createAdminUser({ data: { name, email, role, password } })
      if (!result.success) {
        toast.error((result as { error: string }).error)
        return
      }
      toast.success('Admin account created.')
      onCreated?.()
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div>
          <h2 className='text-xl font-semibold'>New Admin Account</h2>
          <p className='text-muted-foreground text-sm mt-0.5'>Create a new admin panel user.</p>
        </div>
        <Button type='button' variant='ghost' size='icon' onClick={handleClose} className='shrink-0 mt-0.5'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-y-auto'>
        <div className='flex-1 p-4 space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='acc-name'>Name</Label>
            <Input id='acc-name' placeholder='Full name' value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='acc-email'>Email</Label>
            <Input id='acc-email' type='email' placeholder='admin@example.com' value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='acc-role'>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id='acc-role'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PasswordInputRaw
            id='acc-password'
            label='Password'
            value={password}
            onChange={setPassword}
            placeholder='Minimum 8 characters'
            minLength={8}
            required
          />
        </div>

        {/* Footer */}
        <div className='p-4 border-t shrink-0'>
          <Button
            type='submit'
            className='w-full shadow-sm shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]'
            disabled={submitting || !name || !email || !password}
          >
            {submitting ? 'Creating…' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  )
}
