import { Form } from '@platform/components/custom/form'
import { PasswordInput } from '@platform/components/custom/form/password-input'
import { TextInput } from '@platform/components/custom/form/text-input'
import { ThemeToggle } from '@platform/components/custom/theme/theme-toggle'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@platform/components/ui/card'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import z from 'zod'
import { loginOnline } from '@/lib/better-auth/auth-engine'

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

export const Route = createFileRoute('/(public)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { email: '', password: '' } as LoginValues,
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      await loginOnline(value.email, value.password, () => navigate({ to: '/dashboard' }))
    },
  })

  return (
    <div className='flex flex-col items-center justify-center h-full p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <CardTitle className='text-2xl font-bold'>Admin Login</CardTitle>
            <ThemeToggle />
          </div>
          <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
        </CardHeader>
        <Form onSubmit={form.handleSubmit} className='space-y-6'>
          <CardContent className='space-y-4'>
            <form.Field name='email' children={field => <TextInput field={field} label='Email' placeholder='name@example.com' data-testid='email-input' />} />
            <form.Field name='password' children={field => <PasswordInput field={field} label='Password' data-testid='password-input' />} />
          </CardContent>
          <CardFooter className='flex flex-col gap-4'>
            <form.Subscribe
              selector={state => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type='submit' className='w-full' disabled={!canSubmit} data-testid='login-button'>
                  {isSubmitting ? <Loader2 className='size-4 mr-2 animate-spin' /> : 'Sign in'}
                </Button>
              )}
            />
            <Link to='/forgot-password' className='text-sm font-medium text-primary underline-offset-4 hover:underline text-center'>
              Forgot your password?
            </Link>
          </CardFooter>
        </Form>
      </Card>
    </div>
  )
}
