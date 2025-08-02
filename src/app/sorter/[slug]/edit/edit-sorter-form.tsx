"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Plus, X, Image as ImageIcon, ArrowLeft, Pencil } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import { generateUniqueId, addSuffixToFileName } from "@/lib/utils";
import CoverImageUpload from "@/components/cover-image-upload";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { UploadProgressDialog } from "@/components/upload-progress-dialog";
import type { UploadedFile, UploadProgress } from "@/types/upload";
import TagManagement, { type Tag } from "@/components/tag-management";
import { toast } from "sonner";
import Link from "next/link";

interface EditSorterFormProps {
  sorter: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    slug: string;
    coverImageUrl: string | null;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
  }>;
  items: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    tagSlugs: string[] | null;
  }>;
}

// Helper function to build R2 public URL (client-safe)
function buildR2PublicUrl(key: string): string {
  // Use the same logic as getR2PublicUrl but with client-safe environment access
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }

  // Fallback - this should be configured in environment
  return `https://dev-cdn.sortr.io/${key}`;
}

export default function EditSorterForm({
  sorter,
  tags,
  items,
}: EditSorterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    sorter.coverImageUrl,
  );
  const [itemImagesData, setItemImagesData] = useState<
    Array<{ file: File; preview: string } | null>
  >([]);
  const [managedTags, setManagedTags] = useState<Tag[]>(
    tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      sortOrder: tag.sortOrder,
    })),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload progress state
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Direct upload hook
  const directUpload = useDirectUpload({
    onProgress: (progress) => {
      // Progress updates are handled by the dialog component
      // Dialog is shown immediately when upload starts
    },
    onSuccess: async (uploadedFiles, abortController) => {
      const formData = form.getValues();
      await updateSorterWithUploadedFiles(
        formData,
        uploadedFiles,
        abortController,
      );
    },
    onError: (error) => {
      setIsUploading(false);
      setShowProgressDialog(false);

      if (error !== "AbortError") {
        console.error("Upload error:", error);
      }
    },
  });

  // Convert existing data to form format
  const defaultItems = items.map((item) => ({
    title: item.title,
    imageUrl: item.imageUrl || undefined,
    tagSlugs: item.tagSlugs || [],
  }));

  const form = useForm<CreateSorterInput>({
    resolver: zodResolver(createSorterSchema) as any,
    defaultValues: {
      title: sorter.title,
      description: sorter.description || "",
      category: sorter.category || "",
      coverImageUrl: sorter.coverImageUrl || undefined,
      tags: managedTags,
      items: defaultItems,
    } as CreateSorterInput,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Handle cover image selection
  const handleCoverImageSelect = (file: File | null) => {
    setCoverImageFile(file);
    if (file) {
      const preview = URL.createObjectURL(file);
      setCoverImagePreview(preview);
      // Don't set coverImageUrl in form - it will be set after upload
      form.setValue("coverImageUrl", undefined);
    } else {
      setCoverImagePreview(sorter.coverImageUrl); // Reset to original
      setCoverImageFile(null);
      form.setValue("coverImageUrl", sorter.coverImageUrl || undefined);
    }
  };

  // Handle item image selection
  const handleItemImageSelect = (index: number, file: File | null) => {
    const newItemImagesData = [...itemImagesData];
    if (file) {
      const preview = URL.createObjectURL(file);
      newItemImagesData[index] = { file, preview };
      // Don't set imageUrl in form - it will be set after upload
      form.setValue(`items.${index}.imageUrl`, undefined);
    } else {
      // Reset to original image if available
      const originalItem = items[index];
      newItemImagesData[index] = null;
      form.setValue(
        `items.${index}.imageUrl`,
        originalItem?.imageUrl || undefined,
      );
    }
    setItemImagesData(newItemImagesData);
  };

  // Handle multiple image upload
  const handleMultipleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const currentItems = form.getValues("items");

    // Find empty slots first (items without names or images)
    const emptySlots: number[] = [];
    currentItems.forEach((item, index) => {
      if (
        !item.title.trim() &&
        !itemImagesData[index] &&
        !items[index]?.imageUrl
      ) {
        emptySlots.push(index);
      }
    });

    // Build the new itemImagesData array with all changes
    const newItemImagesData = [...itemImagesData];

    // Process each selected file
    newFiles.forEach((file, fileIndex) => {
      let targetIndex: number;

      if (fileIndex < emptySlots.length) {
        // Use empty slot
        targetIndex = emptySlots[fileIndex];
      } else {
        // Add new item
        targetIndex = currentItems.length + fileIndex - emptySlots.length;
        // Add new items if needed
        while (form.getValues("items").length <= targetIndex) {
          append({ title: "", tagSlugs: [], imageUrl: undefined });
        }
      }

      // Set the image for this item
      const preview = URL.createObjectURL(file);

      // Extend array if needed
      while (newItemImagesData.length <= targetIndex) {
        newItemImagesData.push(null);
      }

      newItemImagesData[targetIndex] = { file, preview };

      // Set filename as item name (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      form.setValue(`items.${targetIndex}.title`, nameWithoutExt);
      form.setValue(`items.${targetIndex}.imageUrl`, undefined);
    });

    // Update the state once with all changes
    setItemImagesData(newItemImagesData);

    // Clear the input
    event.target.value = "";
  };

  // Add new item
  const addItem = () => {
    append({ title: "", tagSlugs: [], imageUrl: undefined });
    setItemImagesData([...itemImagesData, null]);
  };

  // Remove item
  const removeItem = (index: number) => {
    remove(index);
    setItemImagesData((prev) => {
      const newData = [...prev];
      newData.splice(index, 1);
      return newData;
    });
  };

  const updateSorterWithUploadedFiles = async (
    data: CreateSorterInput,
    uploadedFiles: UploadedFile[],
    abortController: AbortController | null,
  ) => {
    try {
      setIsLoading(true);

      // Map uploaded files to their respective fields
      let coverImageUrl = data.coverImageUrl; // Keep existing if no new upload
      const itemImageUrls = [...data.items.map((item) => item.imageUrl)]; // Keep existing URLs

      uploadedFiles.forEach((uploadedFile) => {
        if (uploadedFile.type === "cover") {
          // For cover images, use the R2 key to build URL
          coverImageUrl = buildR2PublicUrl(uploadedFile.key);
        } else if (uploadedFile.type === "item") {
          // For items, we need to match by original name to get the correct index
          const originalName = uploadedFile.originalName;
          const itemIndex = data.items.findIndex(
            (item, idx) => itemImagesData[idx]?.file.name === originalName,
          );
          if (itemIndex >= 0) {
            itemImageUrls[itemIndex] = buildR2PublicUrl(uploadedFile.key);
          }
        }
      });

      // Prepare the final data
      const finalData = {
        ...data,
        coverImageUrl: coverImageUrl || undefined,
        items: data.items
          .map((item, index) => ({
            ...item,
            imageUrl: itemImageUrls[index] || undefined,
          }))
          .map((item) => ({
            ...item,
            // Remove undefined imageUrl to avoid validation issues
            ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          })),
        tags: managedTags,
      };

      // Update the sorter via API
      const response = await axios.put(
        `/api/sorters/${sorter.slug}`,
        finalData,
        {
          signal: abortController?.signal,
        },
      );

      if (response.data) {
        toast.success("Sorter updated successfully!");
        setShowProgressDialog(false);
        router.push(`/sorter/${sorter.slug}`);
      }
    } catch (error: any) {
      setIsLoading(false);
      setShowProgressDialog(false);

      if (axios.isCancel(error)) {
        toast.info("Update cancelled");
        return;
      }

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update sorter";

      toast.error(errorMessage);
      console.error("Update error:", error);
      throw error;
    }
  };

  // Handle upload cancellation
  const handleCancelUpload = () => {
    setShowProgressDialog(false);
    setIsUploading(false);
    setIsLoading(false);
    directUpload.cancel();
    toast.info("Upload cancelled");
  };

  // Handle form submission
  const onSubmit = async (data: CreateSorterInput) => {
    setIsLoading(true);
    setShowProgressDialog(false); // Reset dialog state
    directUpload.reset(); // Reset upload hook state

    try {
      if (coverImageFile || itemImagesData.some((imageData) => imageData)) {
        // Has new images - use upload flow
        const filesToUpload: File[] = [];
        const fileMetadata: Array<{
          id: string;
          file: File;
          originalName: string;
        }> = [];

        if (coverImageFile) {
          // CRITICAL FIX: Prefix cover image filename with "cover-" for proper file type detection
          const prefixedCoverFile = new File(
            [coverImageFile],
            `cover-${coverImageFile.name}`,
            { type: coverImageFile.type },
          );
          filesToUpload.push(prefixedCoverFile);
          fileMetadata.push({
            id: "cover",
            file: prefixedCoverFile,
            originalName: prefixedCoverFile.name,
          });
        }

        itemImagesData.forEach((imageData, index) => {
          if (imageData) {
            filesToUpload.push(imageData.file);
            fileMetadata.push({
              id: `item-${index}`,
              file: imageData.file,
              originalName: imageData.file.name,
            });
          }
        });

        setIsUploading(true);
        setShowProgressDialog(true); // Show dialog immediately when starting upload
        directUpload.uploadFiles(filesToUpload);
      } else {
        // No new images - direct API call
        const finalData = {
          ...data,
          items: data.items.map((item) => ({
            ...item,
            // Remove undefined imageUrl to avoid validation issues
            ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          })),
          tags: managedTags,
        };

        const response = await axios.put(
          `/api/sorters/${sorter.slug}`,
          finalData,
        );

        if (response.data) {
          toast.success("Sorter updated successfully!");
          router.push(`/sorter/${sorter.slug}`);
        }
      }
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update sorter";
      toast.error(errorMessage);
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <Panel className="mx-auto w-full">
        <PanelHeader variant="primary">
          <div className="flex items-center gap-4">
            <Link
              href={`/sorter/${sorter.slug}`}
              className="flex items-center justify-center transition-opacity hover:opacity-70"
              title="Back to sorter"
            >
              <ArrowLeft size={20} />
            </Link>
            <PanelTitle>Edit Sorter</PanelTitle>
          </div>
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
                          <Input placeholder="e.g., Marvel Movies" {...field} />
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
                            placeholder="Describe your sorter (optional)"
                            className="resize-none"
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category (optional)" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cover Image Upload */}
                  <div>
                    <CoverImageUpload
                      onImageSelect={handleCoverImageSelect}
                      selectedFile={coverImageFile}
                      previewUrl={coverImagePreview}
                    />
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Tags</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Create tags to organize your items. Users can filter by tags
                  before sorting.
                </p>
                <TagManagement
                  tags={managedTags}
                  onTagsChange={setManagedTags}
                />
              </div>

              {/* Items Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Items to Rank *</h2>
                <div className="mb-4">
                  {/* Buttons */}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1"
                    >
                      <ImageIcon size={16} />
                      Upload Images
                    </Button>
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
                  </div>
                </div>

                {/* Hidden file input for multiple uploads */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleMultipleImageSelect}
                  className="hidden"
                />

                {/* Items List */}
                <div className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="py-8">
                      <p className="text-muted-foreground">
                        No items added yet
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Click "Upload Images" or "Add Item" to get started
                      </p>
                    </div>
                  ) : (
                    <>
                      {fields.map((field, index) => (
                        <div key={field.id} className="space-y-0">
                          <FormField
                            control={form.control}
                            name={`items.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  {/* Image preview if available */}
                                  {(() => {
                                    const currentItem = form.watch(
                                      `items.${index}`,
                                    );
                                    const hasNewImage =
                                      itemImagesData[index]?.preview;
                                    const hasExistingImage =
                                      currentItem?.imageUrl;
                                    return hasNewImage || hasExistingImage;
                                  })() && (
                                    <div className="relative flex-shrink-0">
                                      <img
                                        src={(() => {
                                          const currentItem = form.watch(
                                            `items.${index}`,
                                          );
                                          return (
                                            itemImagesData[index]?.preview ||
                                            currentItem?.imageUrl ||
                                            ""
                                          );
                                        })()}
                                        alt={`Preview ${index + 1}`}
                                        className="border-border h-10 w-10 rounded border-2 object-cover"
                                      />
                                      {/* Pencil icon for replacing image */}
                                      <Button
                                        type="button"
                                        variant="neutralNoShadow"
                                        size="icon"
                                        className="absolute -right-1 -bottom-1 h-4 w-4 p-0"
                                        onClick={() => {
                                          const input = document.getElementById(
                                            `item-image-replace-${index}`,
                                          ) as HTMLInputElement;
                                          input?.click();
                                        }}
                                        title="Replace image"
                                      >
                                        <Pencil size={8} />
                                      </Button>
                                      {/* Hidden file input for replacing individual images */}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`item-image-replace-${index}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleItemImageSelect(index, file);
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                  <FormControl>
                                    <Input
                                      placeholder={`Item ${index + 1}`}
                                      {...field}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          // Add new item and focus on it
                                          addItem();
                                          // Focus will be set after the new item is rendered
                                          setTimeout(() => {
                                            const nextInput =
                                              document.querySelector(
                                                `input[name="items.${fields.length}.title"]`,
                                              ) as HTMLInputElement;
                                            nextInput?.focus();
                                          }, 0);
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  {fields.length > 0 && (
                                    <Button
                                      type="button"
                                      variant="neutralNoShadow"
                                      size="sm"
                                      onClick={() => removeItem(index)}
                                      title="Remove item"
                                      className="h-6 w-6 p-0"
                                    >
                                      <X size={14} />
                                    </Button>
                                  )}
                                </div>
                                <FormMessage />

                                {/* Tag selection for this item */}
                                {managedTags.length > 0 && (
                                  <div className="mb-2 flex flex-wrap gap-2">
                                    {managedTags.map((tag) => {
                                      const tagSlug = tag.name
                                        .toLowerCase()
                                        .replace(/\s+/g, "-");
                                      const currentTags =
                                        form.watch(`items.${index}.tagSlugs`) ||
                                        [];
                                      const isSelected =
                                        currentTags.includes(tagSlug);
                                      return (
                                        <Button
                                          key={tag.id}
                                          type="button"
                                          variant={
                                            isSelected ? "default" : "neutral"
                                          }
                                          size="sm"
                                          onClick={() => {
                                            const currentTagSlugs =
                                              form.getValues(
                                                `items.${index}.tagSlugs`,
                                              ) || [];
                                            if (isSelected) {
                                              form.setValue(
                                                `items.${index}.tagSlugs`,
                                                currentTagSlugs.filter(
                                                  (t) => t !== tagSlug,
                                                ),
                                              );
                                            } else {
                                              form.setValue(
                                                `items.${index}.tagSlugs`,
                                                [...currentTagSlugs, tagSlug],
                                              );
                                            }
                                          }}
                                          className="h-8 text-xs"
                                        >
                                          {tag.name}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Add buttons below all items - only show when there's at least one item */}
                  {fields.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1"
                      >
                        <ImageIcon size={16} />
                        Upload Images
                      </Button>
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
                    </div>
                  )}
                </div>

                {/* Items validation error */}
                {fields.length < 2 && (
                  <p className="mt-4 text-sm text-red-500">
                    You need at least 2 items to create a sorter.
                  </p>
                )}

                {/* Instructions */}
                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    <strong>Upload Images:</strong> Select multiple images to
                    automatically create items. Filename (without extension)
                    will be used as the item name. You can still change the name
                    after selecting images.
                  </p>
                  <p>
                    <strong>Add Item:</strong> Manually add text-only items.
                  </p>
                  {managedTags.length > 0 && (
                    <p>
                      <strong>Tags:</strong> Click tag buttons below each item
                      to assign tags. Items without tags will always appear in
                      sorting.
                    </p>
                  )}
                  <p className="text-xs">
                    Supported formats: JPG, PNG, WebP • Max 5MB each • Empty
                    fields will be replaced first when uploading images
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Link href={`/sorter/${sorter.slug}`}>
                  <Button type="button" variant="neutralNoShadow">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="min-w-[120px]"
                >
                  {isLoading || isUploading ? "Updating..." : "Update Sorter"}
                </Button>
              </div>
            </form>
          </Form>
        </PanelContent>
      </Panel>

      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        progress={directUpload.progress}
        onCancel={handleCancelUpload}
      />
    </>
  );
}
