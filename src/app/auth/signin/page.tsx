"use client";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VsMarker } from "@/components/ui/sortr-mark";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { signInSchema, type SignInInput } from "@/lib/validations";

function SignInContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    await signIn("email", { email: data.email, callbackUrl: "/" });
    setIsLoading(false);
  };

  // Customize which errors show. Only show real errors, not old/false ones.
  let errorMessage = null;
  if (error === "EmailSignin") {
    errorMessage =
      "Sorry, we couldn't send the magic link. Please check your email or try again later.";
  } else if (error === "OAuthAccountNotLinked") {
    errorMessage = "This email is already linked to a different provider.";
  }
  // Add other error codes as needed: https://next-auth.js.org/configuration/pages#error-codes

  if (session?.user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="mb-6 flex justify-center">
            <VsMarker size={56} glyph="✓" glyphColor="var(--cyan)" />
          </div>
          <h1 className="display text-[clamp(2.25rem,6vw,3rem)] font-black text-foreground">
            You&apos;re in
          </h1>
          <p className="mt-3 text-muted-foreground">
            Signed in as{" "}
            <strong className="text-foreground">{session.user.email}</strong>.
          </p>
          <div className="mt-6">
            <Button asChild arcade size="lg" className="w-full">
              <Link href="/">Go to home &rarr;</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <h1 className="display text-[clamp(2.25rem,6vw,3rem)] font-black text-foreground">
            Sign in to sortr
          </h1>
          <p className="mt-3 text-muted-foreground">
            Save your rankings, create sorters, and build a profile. Get a
            magic link by email, or continue with Google &mdash; no password.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <label
                      htmlFor="signin-email"
                      className="hud text-xs text-muted-foreground"
                    >
                      Email
                    </label>
                    <FormControl>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        className="h-12"
                        {...field}
                        onKeyDown={(e) =>
                          e.key === "Enter" && form.handleSubmit(onSubmit)()
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Sending..." : "Sign in with email →"}
              </Button>
            </form>
          </Form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="hud text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="neutral"
            size="lg"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="mt-5 text-center font-mono text-xs text-muted-foreground">
          no account? signing in makes one.{" "}
          <Link href="/browse" className="text-cyan-ink hover:underline">
            or just browse →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <p className="hud text-xs text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
