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
import { Switch } from "@/components/ui/switch";
import { Plus, X, Camera, ChevronDown, GripVertical } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";

export default function CreateSorterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  // Initialize groups when switching to filters mode
  useEffect(() => {
    if (useGroups) {
      // Initialize groups if they don't exist
      if (!form.getValues("groups")) {
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

      const response = await fetch("/api/sorters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

            {/* Filters Toggle */}
            <FormField
              control={form.control}
              name="useGroups"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Use Filters</FormLabel>
                    <div className="text-muted-foreground text-sm">
                      Group items into filters for selective sorting
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                  variant="outline"
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
                  <div key={groupField.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <GripVertical className="text-muted-foreground h-4 w-4" />
                      <FormField
                        control={form.control}
                        name={`groups.${groupIndex}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Filter name (e.g., Kill em All)"
                                {...field}
                                className="font-medium"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {groupFields.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeGroupHandler(groupIndex)}
                          title="Remove filter"
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>

                    <div className="ml-6 space-y-2">
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
                                  {form.watch(`groups.${groupIndex}.items`)
                                    .length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeItemFromGroup(
                                          groupIndex,
                                          itemIndex,
                                        )
                                      }
                                      title="Remove item"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addItemToGroup(groupIndex)}
                        className="mt-2 flex items-center gap-1 text-sm"
                      >
                        <Plus size={14} />
                        Add Item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-muted-foreground mt-4 text-sm">
                <p>
                  Add at least 2 filters with 1 item each to create your sorter
                </p>
              </div>
            </div>
          ) : (
            /* Traditional Mode */
            <div>
              <div className="mb-4 flex items-center justify-between">
                <FormLabel>Items to Rank *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
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
                              variant="outline"
                              size="sm"
                              onClick={() => removeItemHandler(index)}
                              title="Remove item"
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

              <div className="text-muted-foreground mt-4 text-sm">
                <p>Add at least 2 items to create your sorter</p>
              </div>
            </div>
          )}

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
