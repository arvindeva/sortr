'use client'
import Link from 'next/link'
import { Button } from './button'
import { usePathname } from 'next/navigation'

export default function SignInButton() {
  const pathname = usePathname()
  return (
    <Link href={`/api/auth/signin?callbackUrl=${pathname}`}>
      <Button>Sign in</Button>
    </Link>
  )
}
