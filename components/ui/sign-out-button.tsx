'use client'

import { Button } from './button'

export default function SignoutButton({ signOut }: { signOut: () => void }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        signOut()
      }}
    >
      Sign out
    </Button>
  )
}
