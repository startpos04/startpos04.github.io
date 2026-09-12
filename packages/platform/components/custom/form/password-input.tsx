import { Field } from '@platform/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@platform/components/ui/input-group'
import { Label } from '@platform/components/ui/label'
import type { AnyFieldApi } from '@tanstack/react-form'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'

// ---------------------------------------------------------------------------
// PasswordInput — for use with @tanstack/react-form (AnyFieldApi)
// ---------------------------------------------------------------------------

interface PasswordInputProps {
  label?: string | ReactNode
  field: AnyFieldApi
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  'data-testid'?: string
}

export function PasswordInput({
  label,
  field,
  placeholder = 'Enter password',
  disabled,
  autoComplete = 'current-password',
  'data-testid': dataTestId,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <Label className='empty:hidden'>{label}</Label>
      <InputGroup>
        <InputGroupInput
          type={visible ? 'text' : 'password'}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={e => field.handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          data-testid={dataTestId}
          autoComplete={autoComplete}
        />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton type='button' aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)} tabIndex={-1}>
            {visible ? <EyeOffIcon className='size-3.5 text-muted-foreground' /> : <EyeIcon className='size-3.5 text-muted-foreground' />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {field.state.meta.errors.length > 0 && <p className='text-xs text-destructive'>{field.state.meta.errors.map(err => err?.message ?? err).join(', ')}</p>}
    </Field>
  )
}

// ---------------------------------------------------------------------------
// PasswordInputRaw — for use with plain useState / uncontrolled forms
// ---------------------------------------------------------------------------

interface PasswordInputRawProps {
  id?: string
  label?: string | ReactNode
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  required?: boolean
  minLength?: number
  'data-testid'?: string
}

export function PasswordInputRaw({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Enter password',
  disabled,
  autoComplete = 'new-password',
  required,
  minLength,
  'data-testid': dataTestId,
}: PasswordInputRawProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <Label htmlFor={id} className='empty:hidden'>
        {label}
      </Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          data-testid={dataTestId}
        />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton type='button' aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)} tabIndex={-1}>
            {visible ? <EyeOffIcon className='size-3.5 text-muted-foreground' /> : <EyeIcon className='size-3.5 text-muted-foreground' />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
