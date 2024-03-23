import { ModeToggle } from './mode-toggle'
import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import SignoutButton from '@/components/ui/sign-out-button'
import Link from 'next/link'

export default async function Navbar() {
  const session = await auth()

  const authed = !!session?.user

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-row justify-between items-center max-w-screen-xl mx-auto py-2">
        <div className="">
          <Link href="/">
            <h1 className="text-2xl font-semibold">Sortr</h1>
          </Link>
        </div>
        <div className="flex flex-row items-center space-x-4">
          <ul className="text-muted-foreground">
            <li>
              <Link href="/me">Profile</Link>
            </li>
          </ul>
          <ModeToggle />
          {authed ? (
            <SignoutButton
              signOut={async () => {
                'use server'
                await signOut({ redirectTo: '/' })
              }}
            />
          ) : (
            <Link href="/api/auth/signin">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
