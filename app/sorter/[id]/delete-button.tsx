'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { deleteSorter } from './actions'

interface DeleteButtonProps {
  id: number
}
export default function DeleteButton({ id }: DeleteButtonProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>('')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  async function onDelete() {
    setErrorMessage(null)
    setStatus('loading')
    const error = await deleteSorter(id)
    if (error) {
      setErrorMessage(error.message)
    }
    setStatus('idle')
  }
  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="text-red text-lg">Failed to delete Sorter</p>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={status === 'loading'}
      >
        {status === 'idle' && 'Delete sorter'}
        {status === 'loading' && 'Deleting...'}
      </Button>
    </div>
  )
}
