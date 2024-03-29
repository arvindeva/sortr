import { ModeToggle } from './mode-toggle'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import SignInButton from './sign-in-button'

export default async function Navbar() {
  const session = await auth()

  const authed = !!session?.user

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-row justify-between items-center content-width mx-auto py-3 px-4">
        <div className="">
          <Link href="/" className="text-4xl font-black">
            SORTR
          </Link>
        </div>
        <div className="flex flex-row items-center space-x-8">
          <ul className="text-muted-foreground">
            {authed && (
              <li>
                <Link href="/me">My Account</Link>
              </li>
            )}
          </ul>
          <ModeToggle />
          {!authed && <SignInButton />}
        </div>
      </div>
    </header>
  )
}
