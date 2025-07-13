"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, X, Camera } from "lucide-react";
import { createSorterFormSchema, type CreateSorterFormInput } from "@/lib/validations";

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
    setItemImages(prev => [...prev, null]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // Remove corresponding image
      setItemImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle Enter key in item inputs
  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
      e.preventDefault(); // Prevent form submission
      
      // Mark that user has used the Enter shortcut
      setHasUsedEnterShortcut(true);
      setShowEnterHint(false);
      
      // Add new item after current one
      const newIndex = index + 1;
      append({ title: "" });
      // Insert null image slot at the correct position
      setItemImages(prev => {
        const newImages = [...prev];
        newImages.splice(newIndex, 0, null);
        return newImages;
      });
      
      // Focus the new input after a short delay to allow DOM update
      setTimeout(() => {
        const newInput = document.querySelector(`input[name="items.${newIndex}.title"]`) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
        }
      }, 0);
    }
  };

  // Handle auto-detection when typing in last field
  const handleItemChange = (value: string, index: number, onChange: (value: string) => void) => {
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
      setItemImages(prev => [...prev, null]);
    }
  };

  // Handle image upload (placeholder for now)
  const handleImageUpload = (index: number) => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create preview URL
        const imageUrl = URL.createObjectURL(file);
        setItemImages(prev => {
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
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-card-foreground"
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
                          {/* Thumbnail Preview */}
                          {itemImages[index] && (
                            <div 
                              className="flex-shrink-0 w-10 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleImageUpload(index)}
                              title="Click to change image"
                            >
                              <img
                                src={itemImages[index]!}
                                alt={`Preview for ${field.value || `Item ${index + 1}`}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <FormControl>
                            <Input
                              placeholder={`Item ${index + 1}`}
                              onKeyDown={(e) => handleItemKeyDown(e, index)}
                              onFocus={handleItemFocus}
                              {...field}
                              onChange={(e) => handleItemChange(e.target.value, index, field.onChange)}
                            />
                          </FormControl>
                          
                          {/* Image Upload Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleImageUpload(index)}
                            className={`flex-shrink-0 ${itemImages[index] ? 'bg-primary/10 border-primary/20' : ''}`}
                            title={itemImages[index] ? "Change image" : "Add image for this item"}
                          >
                            <Camera size={16} className={itemImages[index] ? 'text-primary' : ''} />
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
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.items.root.message}
                </p>
              )}
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>Add at least 2 items to create your sorter</p>
                <p className="text-xs">💡 Tip: Press Enter while typing to quickly add more items</p>
                
                {/* Contextual Enter Hint */}
                {showEnterHint && !hasUsedEnterShortcut && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 mt-3 animate-in fade-in duration-300">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
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
      </CardContent>
    </Card>
  );
}