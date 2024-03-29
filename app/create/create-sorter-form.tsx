'use client'

import { useState } from 'react'
import { createSorter } from './actions'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  title: z.string().min(2, {
    message: 'title must be at least 2 characters.',
  }),
})

export default function CreateSorterForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  })

  async function onSubmit({ title }: z.infer<typeof formSchema>) {
    setErrorMessage(null)
    setStatus('loading')
    const error = await createSorter({ title })
    if (error) {
      setErrorMessage(error.message)
    }
    setStatus('idle')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Sortr title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {errorMessage && (
          <p className="text-red-600 font-semibold">{errorMessage}</p>
        )}
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'idle' && 'Create sorter'}
          {status === 'loading' && 'Creating...'}
        </Button>
      </form>
    </Form>
  )
}
