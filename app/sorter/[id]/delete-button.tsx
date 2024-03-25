'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { deleteSorter } from './actions'

interface DeleteButtonProps {
  id: number
}
export default function DeleteButton({ id }: DeleteButtonProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>('')
  async function onDelete() {
    setErrorMessage(null)
    const error = await deleteSorter(id)
    if (error) {
      setErrorMessage(error.message)
    }
  }
  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="text-red text-lg">Failed to delete Sorter</p>
      )}
      <Button variant="destructive" size="sm" onClick={onDelete}>
        Delete Sorter
      </Button>
    </div>
  )
}
