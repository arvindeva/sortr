"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Plus, X } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import { generateUniqueTagSlug } from "@/lib/utils";
import TagManagement, { type Tag } from "@/components/tag-management";
import { toast } from "sonner";

export default function CreateSorterFormTags() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  const form = useForm<CreateSorterInput>({
    resolver: zodResolver(createSorterSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: [],
      items: [
        { title: "", tagSlugs: [] },
        { title: "", tagSlugs: [] },
      ], // Start with 2 empty items
    },
  });

  // Watch all items to ensure badge states update
  const watchedItems = form.watch("items");

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Handle tag changes and sync with form
  const handleTagsChange = (newTags: Tag[]) => {
    setTags(newTags);

    // Convert tags to the format expected by the validation schema
    const formTags = newTags.map((tag) => ({
      name: tag.name,
      sortOrder: tag.sortOrder,
    }));

    form.setValue("tags", formTags);
  };

  // Handle tag selection for an item
  const handleItemTagToggle = (itemIndex: number, tagId: string) => {
    const currentItem = form.getValues(`items.${itemIndex}`);
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) {
      console.log("Tag not found:", tagId);
      return;
    }

    // Use tag name for now - the backend will convert to slugs
    const currentTagSlugs = currentItem.tagSlugs || [];

    let newTagSlugs: string[];
    if (currentTagSlugs.includes(tag.name)) {
      // Remove tag
      newTagSlugs = currentTagSlugs.filter((name) => name !== tag.name);
      console.log(`Removing tag "${tag.name}" from item ${itemIndex}`);
    } else {
      // Add tag
      newTagSlugs = [...currentTagSlugs, tag.name];
      console.log(`Adding tag "${tag.name}" to item ${itemIndex}`);
    }

    form.setValue(`items.${itemIndex}.tagSlugs`, newTagSlugs);
    // Force form to re-render
    form.trigger(`items.${itemIndex}.tagSlugs`);
  };

  // Check if item has a specific tag
  const itemHasTag = (itemIndex: number, tagId: string): boolean => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return false;

    const currentItem = form.getValues(`items.${itemIndex}`);
    return (currentItem.tagSlugs || []).includes(tag.name);
  };

  // Add new item
  const addItem = () => {
    appendItem({ title: "", tagSlugs: [] });
  };

  // Remove item
  const removeItemHandler = (index: number) => {
    if (itemFields.length > 2) {
      removeItem(index);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreateSorterInput) => {
    setIsLoading(true);

    try {
      // For now, just create a basic sorter without images
      const response = await fetch("/api/sorters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sorter");
      }

      const result = await response.json();
      toast.success("Sorter created successfully!");
      router.push(`/sorter/${result.sorter.slug}`);
    } catch (error) {
      console.error("Error creating sorter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create sorter",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Panel variant="primary" className="bg-background">
        <PanelHeader variant="primary">
          <PanelTitle>Create New Sorter</PanelTitle>
        </PanelHeader>
        <PanelContent variant="primary" className="bg-background p-2 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Sorter Details Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Sorter Details</h2>
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
                          <Textarea
                            placeholder="Describe what you're ranking..."
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Movies & TV">
                                Movies & TV
                              </SelectItem>
                              <SelectItem value="Music">Music</SelectItem>
                              <SelectItem value="Video Games">
                                Video Games
                              </SelectItem>
                              <SelectItem value="Books">Books</SelectItem>
                              <SelectItem value="Food">Food</SelectItem>
                              <SelectItem value="Sports">Sports</SelectItem>
                              <SelectItem value="Fashion">Fashion</SelectItem>
                              <SelectItem value="Academics">
                                Academics
                              </SelectItem>
                              <SelectItem value="Anime & Manga">
                                Anime & Manga
                              </SelectItem>
                              <SelectItem value="Tech">Tech</SelectItem>
                              <SelectItem value="Internet">Internet</SelectItem>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Nature">Nature</SelectItem>
                              <SelectItem value="Hobbies">Hobbies</SelectItem>
                              <SelectItem value="Vehicles">Vehicles</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tags Section */}
              <div className="mb-6">
                <h2 className="mb-2 text-xl font-semibold">
                  Filter Tags (Optional)
                </h2>
                <p className="text-foreground mb-4 text-sm">
                  Add tags to enable filtering during sorting. For example:
                  album names, seasons, categories, etc.
                </p>
                <TagManagement tags={tags} onTagsChange={handleTagsChange} />
              </div>

              {/* Items Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Items to Rank</h2>
                <div className="space-y-6">
                  {itemFields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder={`Item ${index + 1}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {itemFields.length > 2 && (
                          <Button
                            type="button"
                            variant="neutralNoShadow"
                            size="sm"
                            onClick={() => removeItemHandler(index)}
                            className="h-10 w-10 p-0"
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>

                      {/* Tag selection for this item */}
                      {tags.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant={
                                  itemHasTag(index, tag.id)
                                    ? "default"
                                    : "neutral"
                                }
                                className="cursor-pointer"
                                onClick={() =>
                                  handleItemTagToggle(index, tag.id)
                                }
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={addItem}
                    className="flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Item
                  </Button>

                  {tags.length > 0 && (
                    <div className="text-muted-foreground mt-4 text-sm">
                      <p>
                        <strong>Tip:</strong> Click tag badges below each item
                        to assign tags. Items without tags will always appear in
                        sorting.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form-level validation errors */}
              {form.formState.errors.root && (
                <div className="rounded border-2 border-red-500 bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <p className="font-medium">Please fix the following:</p>
                  <p className="text-sm">
                    {form.formState.errors.root.message}
                  </p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Sorter"}
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </PanelContent>
      </Panel>
    </div>
  );
}
