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
          <div className="mb-6 flex justify-center">
            <VsMarker size={56} />
          </div>
          <h1 className="display text-[clamp(2.25rem,6vw,3rem)] font-black text-foreground">
            Sign in to sortr
          </h1>
          <p className="mt-3 text-muted-foreground">
            Save your rankings, create sorters, and build a profile. We&apos;ll
            email you a magic link &mdash; no password.
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
                arcade
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Sending..." : "Sign in with email →"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="mt-5 text-center font-mono text-xs text-muted-foreground">
          no account? entering your email makes one.{" "}
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
