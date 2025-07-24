"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import {
  Plus,
  X,
  Camera,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import CoverImageUpload from "@/components/cover-image-upload";

export default function CreateSorterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const form = useForm<CreateSorterInput>({
    resolver: zodResolver(createSorterSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      useGroups: false,
      groups: undefined,
      items: [{ title: "" }, { title: "" }],
    } as CreateSorterInput,
  });

  const useGroups = form.watch("useGroups");

  // Handle cover image selection
  const handleCoverImageSelect = (file: File | null) => {
    setCoverImageFile(file);
    
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    } else {
      // Clean up preview URL
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
      setCoverImagePreview(null);
    }
  };

  // Clean up preview URL on component unmount
  useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  // Initialize groups when switching to filters mode
  useEffect(() => {
    if (useGroups) {
      // Initialize groups if they don't exist or are empty
      const currentGroups = form.getValues("groups");
      if (!currentGroups || currentGroups.length === 0) {
        form.setValue("groups", [
          {
            name: "",
            items: [{ title: "" }, { title: "" }],
          },
          {
            name: "",
            items: [{ title: "" }, { title: "" }],
          },
        ]);
      }
      // Clear items array when using groups
      form.setValue("items", undefined);
    } else {
      // Clear groups when not using them
      form.setValue("groups", undefined);
      // Initialize items if they don't exist
      if (!form.getValues("items") || form.getValues("items")?.length === 0) {
        form.setValue("items", [{ title: "" }, { title: "" }]);
      }
    }
  }, [useGroups, form]);

  // Field arrays for both modes
  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup,
    move: moveGroup,
  } = useFieldArray({
    control: form.control,
    name: "groups",
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Add new group
  const addGroup = () => {
    appendGroup({
      name: "",
      items: [{ title: "" }, { title: "" }],
    });
  };

  // Remove group
  const removeGroupHandler = (index: number) => {
    if (groupFields.length > 2) {
      removeGroup(index);
    }
  };

  // Move group up
  const moveGroupUp = (index: number) => {
    if (index > 0) {
      moveGroup(index, index - 1);
    }
  };

  // Move group down
  const moveGroupDown = (index: number) => {
    if (index < groupFields.length - 1) {
      moveGroup(index, index + 1);
    }
  };

  // Add new item to specific group
  const addItemToGroup = (groupIndex: number) => {
    const currentItems = form.getValues(`groups.${groupIndex}.items`);
    form.setValue(`groups.${groupIndex}.items`, [
      ...currentItems,
      { title: "" },
    ]);
  };

  // Remove item from specific group
  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    const currentItems = form.getValues(`groups.${groupIndex}.items`);
    if (currentItems.length > 1) {
      form.setValue(
        `groups.${groupIndex}.items`,
        currentItems.filter((_, i) => i !== itemIndex),
      );
    }
  };

  // Add new item (traditional mode)
  const addItemHandler = () => {
    appendItem({ title: "" });
  };

  // Remove item (traditional mode)
  const removeItemHandler = (index: number) => {
    if (itemFields.length > 2) {
      removeItem(index);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreateSorterInput) => {
    setIsLoading(true);

    try {
      // Safety check for required fields
      if (!data.title || !data.title.trim()) {
        alert("Title is required");
        setIsLoading(false);
        return;
      }

      const payload = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        useGroups: data.useGroups,
      };

      if (data.useGroups && data.groups) {
        // Filter out empty groups and items
        const validGroups = data.groups
          .filter((group) => group.name.trim())
          .map((group) => ({
            name: group.name.trim(),
            items: group.items
              .filter((item) => item.title.trim())
              .map((item) => ({
                title: item.title.trim(),
              })),
          }))
          .filter((group) => group.items.length > 0);

        Object.assign(payload, { groups: validGroups });
      } else {
        // Traditional mode
        const validItems =
          data.items
            ?.filter((item) => item.title.trim())
            .map((item) => ({ title: item.title.trim() })) || [];

        Object.assign(payload, { items: validItems });
      }

      let response;

      if (coverImageFile) {
        // Send as multipart form data with cover image
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        formData.append("coverImage", coverImageFile);

        response = await fetch("/api/sorters", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send as regular JSON
        response = await fetch("/api/sorters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sorter");
      }

      const result = await response.json();

      // Redirect to sorter page (keep loading state during redirect)
      router.push(`/sorter/${result.sorter.slug}`);
    } catch (error) {
      console.error("Error creating sorter:", error);
      alert(error instanceof Error ? error.message : "Failed to create sorter");
      setIsLoading(false); // Only set loading false on error
    }
  };

  return (
    <div>
      <Panel variant="primary" className="bg-background">
        <PanelHeader variant="primary">
          <PanelTitle>Sorter Details</PanelTitle>
        </PanelHeader>
        <PanelContent variant="primary" className="bg-background p-2 md:p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                  e.preventDefault();
                }
              }}
              className="space-y-6"
            >
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
                            <SelectItem value="Academics">Academics</SelectItem>
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

                {/* Cover Image Upload */}
                <CoverImageUpload
                  onImageSelect={handleCoverImageSelect}
                  selectedFile={coverImageFile}
                  previewUrl={coverImagePreview}
                  disabled={isLoading}
                />

                {/* Filters Toggle */}
                <FormField
                  control={form.control}
                  name="useGroups"
                  render={({ field }) => (
                    <FormItem>
                      <Box
                        variant="secondary"
                        size="md"
                        className="flex flex-row items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Use Filters
                          </FormLabel>
                          <div className="text-sm font-medium">
                            Group items into filters for selective sorting
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </Box>
                    </FormItem>
                  )}
                />
              </div>

              {/* Items Section */}
              {useGroups ? (
                /* Filters Mode */
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <FormLabel>Filters *</FormLabel>
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={addGroup}
                      className="flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Filter
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {groupFields.map((groupField, groupIndex) => (
                      <div
                        key={groupField.id}
                        className="flex items-center gap-3"
                      >
                        <Box
                          variant="white"
                          size="md"
                          className="flex-1 p-3 md:px-6 md:py-3"
                        >
                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between">
                              <FormLabel>Filter name</FormLabel>
                              {/* Remove button */}
                              {groupFields.length > 2 && (
                                <Button
                                  type="button"
                                  variant="neutralNoShadow"
                                  size="sm"
                                  onClick={() => removeGroupHandler(groupIndex)}
                                  title="Remove filter"
                                  className="h-6 w-6 min-w-0 flex-shrink-0 p-0"
                                >
                                  <X size={14} />
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <FormField
                                control={form.control}
                                name={`groups.${groupIndex}.name`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        placeholder="Filter name"
                                        {...field}
                                        className="font-medium"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <div>
                            <FormLabel className="mb-2 block">Items</FormLabel>
                            <div className="space-y-2">
                              {form
                                .watch(`groups.${groupIndex}.items`)
                                ?.map((_, itemIndex) => (
                                  <FormField
                                    key={itemIndex}
                                    control={form.control}
                                    name={`groups.${groupIndex}.items.${itemIndex}.title`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <div className="flex items-center gap-2">
                                          <FormControl>
                                            <Input
                                              placeholder={`Item ${itemIndex + 1}`}
                                              {...field}
                                            />
                                          </FormControl>
                                          {form.watch(
                                            `groups.${groupIndex}.items`,
                                          ).length > 1 && (
                                            <Button
                                              type="button"
                                              variant="neutralNoShadow"
                                              size="sm"
                                              onClick={() =>
                                                removeItemFromGroup(
                                                  groupIndex,
                                                  itemIndex,
                                                )
                                              }
                                              title="Remove item"
                                              className="h-6 w-6 p-0"
                                            >
                                              <X size={14} />
                                            </Button>
                                          )}
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              <Button
                                type="button"
                                variant="neutral"
                                size="sm"
                                onClick={() => addItemToGroup(groupIndex)}
                                className="mt-2 flex items-center gap-1 text-sm"
                              >
                                <Plus size={14} />
                                Add Item
                              </Button>
                            </div>
                          </div>
                        </Box>

                        {/* Up/Down arrows outside the card */}
                        <div className="flex flex-col gap-1">
                          {/* Move up button */}
                          {groupIndex > 0 ? (
                            <Button
                              type="button"
                              variant="neutral"
                              size="sm"
                              onClick={() => moveGroupUp(groupIndex)}
                              title="Move filter up"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronUp size={14} />
                            </Button>
                          ) : (
                            <div className="h-6 w-6"></div>
                          )}
                          {/* Move down button */}
                          {groupIndex < groupFields.length - 1 ? (
                            <Button
                              type="button"
                              variant="neutral"
                              size="sm"
                              onClick={() => moveGroupDown(groupIndex)}
                              title="Move filter down"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown size={14} />
                            </Button>
                          ) : (
                            <div className="h-6 w-6"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Box variant="accent" size="sm" className="mt-4">
                    <p className="text-sm font-medium">
                      Add at least 2 filters with 1 item each to create your
                      sorter
                    </p>
                  </Box>
                </div>
              ) : (
                /* Traditional Mode */
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <FormLabel>Items to Rank *</FormLabel>
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={addItemHandler}
                      className="flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {itemFields.map((field, index) => (
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
                              {itemFields.length > 2 && (
                                <Button
                                  type="button"
                                  variant="neutralNoShadow"
                                  size="sm"
                                  onClick={() => removeItemHandler(index)}
                                  title="Remove item"
                                  className="h-6 w-6 p-0"
                                >
                                  <X size={14} />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <Box variant="accent" size="sm" className="mt-4">
                    <p className="text-sm font-medium">
                      Add at least 2 items to create your sorter
                    </p>
                  </Box>
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
