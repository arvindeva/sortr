'use client'

import { Button } from './button'

export default function SignoutButton({ signOut }: { signOut: () => void }) {
  return (
    <Button
      onClick={() => {
        signOut()
      }}
    >
      Sign out
    </Button>
  )
}
