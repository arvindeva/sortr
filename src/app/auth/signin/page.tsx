"use client";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="mt-20 flex flex-col items-center px-4">
        <p className="mb-4">
          You are already signed in as <strong>{session.user.email}</strong>
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go to home
        </a>
      </div>
    );
  }

  return (
    <div className="mt-20 flex flex-col items-center px-4">
      <h1 className="mb-6 text-3xl font-bold">Sign in to sortr</h1>
      {errorMessage && (
        <div className="mb-4 rounded border border-red-300 bg-red-100 p-4 text-red-700">
          {errorMessage}
        </div>
      )}
      <div className="w-full max-w-md">
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
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
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
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Sending..." : "Sign in with Email"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-20 flex items-center justify-center px-4">
          Loading...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
