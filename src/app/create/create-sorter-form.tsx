"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, X, Camera, ChevronDown } from "lucide-react";
import {
  createSorterFormSchema,
  type CreateSorterFormInput,
} from "@/lib/validations";

export default function CreateSorterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [itemImages, setItemImages] = useState<(string | null)[]>([]);
  const [showEnterHint, setShowEnterHint] = useState(false);
  const [hasUsedEnterShortcut, setHasUsedEnterShortcut] = useState(false);

  const form = useForm<CreateSorterFormInput>({
    resolver: zodResolver(createSorterFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      items: [{ title: "" }, { title: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Initialize images array to match fields length
  useEffect(() => {
    if (itemImages.length !== fields.length) {
      setItemImages(Array(fields.length).fill(null));
    }
  }, [fields.length, itemImages.length]);

  // Add new item
  const addItem = () => {
    append({ title: "" });
    // Add null image slot for new item
    setItemImages((prev) => [...prev, null]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // Remove corresponding image
      setItemImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handle Enter key in item inputs
  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) {
      e.preventDefault(); // Prevent form submission

      // Mark that user has used the Enter shortcut
      setHasUsedEnterShortcut(true);
      setShowEnterHint(false);

      // Add new item after current one
      const newIndex = index + 1;
      append({ title: "" });
      // Insert null image slot at the correct position
      setItemImages((prev) => {
        const newImages = [...prev];
        newImages.splice(newIndex, 0, null);
        return newImages;
      });

      // Focus the new input after a short delay to allow DOM update
      setTimeout(() => {
        const newInput = document.querySelector(
          `input[name="items.${newIndex}.title"]`,
        ) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
        }
      }, 0);
    }
  };

  // Handle auto-detection when typing in last field
  const handleItemChange = (
    value: string,
    index: number,
    onChange: (value: string) => void,
  ) => {
    // Update the field value first
    onChange(value);

    // Check if this is the last field and user just started typing (went from empty to non-empty)
    const isLastField = index === fields.length - 1;
    const wasEmpty = !form.getValues(`items.${index}.title`);
    const isNowNonEmpty = value.trim().length > 0;

    if (isLastField && wasEmpty && isNowNonEmpty) {
      // Add a new empty field
      append({ title: "" });
      // Add null image slot for new item
      setItemImages((prev) => [...prev, null]);
    }
  };

  // Handle image upload (placeholder for now)
  const handleImageUpload = (index: number) => {
    // Create file input element
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create preview URL
        const imageUrl = URL.createObjectURL(file);
        setItemImages((prev) => {
          const newImages = [...prev];
          newImages[index] = imageUrl;
          return newImages;
        });
      }
    };
    input.click();
  };

  // Handle focus on item inputs to show hint
  const handleItemFocus = () => {
    if (!hasUsedEnterShortcut && !showEnterHint) {
      setShowEnterHint(true);
      // Auto-hide hint after 4 seconds
      setTimeout(() => {
        setShowEnterHint(false);
      }, 4000);
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
          items: data.items.map((item) => ({ title: item.title.trim() })),
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
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Sorter Details</h2>
      </div>
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
                    <Input placeholder="e.g., Best Marvel Movies" {...field} />
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
                      className="border-input focus:ring-ring w-full resize-none rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
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
                    <div className="relative">
                      <select
                        className="border-input focus:ring-ring bg-background text-foreground [&>option[value='']]:text-muted-foreground w-full cursor-pointer appearance-none rounded-md border py-2 pr-10 pl-3 focus:ring-2 focus:outline-none"
                        {...field}
                      >
                        <option value="" className="text-muted-foreground">
                          Select a category
                        </option>
                        <option value="Movies">Movies</option>
                        <option value="Music">Music</option>
                        <option value="Video Games">Video Games</option>
                        <option value="TV Shows">TV Shows</option>
                        <option value="Books">Books</option>
                        <option value="Food">Food</option>
                        <option value="Sports">Sports</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Items */}
          <div>
            <div className="mb-4 flex items-center justify-between">
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
                        {/* Thumbnail Preview */}
                        {itemImages[index] && (
                          <div
                            className="h-10 w-10 flex-shrink-0 cursor-pointer overflow-hidden rounded border transition-opacity hover:opacity-80"
                            onClick={() => handleImageUpload(index)}
                            title="Click to change image"
                          >
                            <img
                              src={itemImages[index]!}
                              alt={`Preview for ${field.value || `Item ${index + 1}`}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <FormControl>
                          <Input
                            placeholder={`Item ${index + 1}`}
                            onKeyDown={(e) => handleItemKeyDown(e, index)}
                            onFocus={handleItemFocus}
                            {...field}
                            onChange={(e) =>
                              handleItemChange(
                                e.target.value,
                                index,
                                field.onChange,
                              )
                            }
                          />
                        </FormControl>

                        {/* Image Upload Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageUpload(index)}
                          className={`flex-shrink-0 ${itemImages[index] ? "bg-primary/10 border-primary/20" : ""}`}
                          title={
                            itemImages[index]
                              ? "Change image"
                              : "Add image for this item"
                          }
                        >
                          <Camera
                            size={16}
                            className={itemImages[index] ? "text-primary" : ""}
                          />
                        </Button>

                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="flex-shrink-0"
                            title="Remove this item"
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
              <p className="text-destructive mt-2 text-sm">
                {form.formState.errors.items.root.message}
              </p>
            )}
            <div className="text-muted-foreground mt-2 space-y-1 text-sm">
              <p>Add at least 2 items to create your sorter</p>
              <p className="text-xs">
                💡 Tip: Press Enter while typing to quickly add more items
              </p>

              {/* Contextual Enter Hint */}
              {showEnterHint && !hasUsedEnterShortcut && (
                <div className="animate-in fade-in mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 duration-300 dark:border-blue-800 dark:bg-blue-950/30">
                  <p className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
                    <span>⌨️</span>
                    Press Enter to add another item
                  </p>
                </div>
              )}
            </div>
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
    </div>
  );
}
