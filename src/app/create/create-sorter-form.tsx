"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, X } from "lucide-react";
import { createSorterFormSchema, type CreateSorterFormInput } from "@/lib/validations";

export default function CreateSorterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateSorterFormInput>({
    resolver: zodResolver(createSorterFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      items: [
        { title: "" },
        { title: "" }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Add new item
  const addItem = () => {
    append({ title: "" });
  };

  // Remove item
  const removeItem = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreateSorterFormInput) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/sorters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description?.trim() || undefined,
          category: data.category?.trim() || undefined,
          items: data.items.map(item => ({ title: item.title.trim() })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sorter");
      }

      const result = await response.json();

      // Redirect to sorter page
      router.push(`/sorter/${result.sorter.id}`);
    } catch (error) {
      console.error("Error creating sorter:", error);
      alert(error instanceof Error ? error.message : "Failed to create sorter");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sorter Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Best Marvel Movies"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Describe what you're ranking..."
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        {...field}
                      >
                        <option value="">Select a category</option>
                        <option value="Movies">Movies</option>
                        <option value="Music">Music</option>
                        <option value="Video Games">Video Games</option>
                        <option value="TV Shows">TV Shows</option>
                        <option value="Books">Books</option>
                        <option value="Food">Food</option>
                        <option value="Sports">Sports</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <FormLabel>Items to Rank *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`items.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder={`Item ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          {fields.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="flex-shrink-0"
                            >
                              <X size={16} />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.items.root.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Add at least 2 items to create your sorter
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create Sorter"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}