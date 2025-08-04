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
// Note: Image compression is now handled by the upload hook
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import { generateUniqueId, addSuffixToFileName } from "@/lib/utils";
import CoverImageUpload from "@/components/cover-image-upload";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { UploadProgressDialog } from "@/components/upload-progress-dialog";
import type { UploadedFile, UploadProgress } from "@/types/upload";
import TagManagement, { type Tag } from "@/components/tag-management";
import { toast } from "sonner";

export default function CreateSorterFormTags() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );
  const [itemImagesData, setItemImagesData] = useState<
    Array<{ file: File; preview: string } | null>
  >([]);
  const [tags, setTags] = useState<Tag[]>([]);
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
      // Files uploaded successfully, now create sorter with references
      const formData = form.getValues();
      await createSorterWithUploadedFiles(
        formData,
        uploadedFiles,
        abortController,
      );
    },
    onError: (error) => {
      setIsUploading(false);
      setShowProgressDialog(false);

      // Don't log AbortError as it's expected during cancellation
      if (error !== "AbortError") {
        console.error("Upload error:", error);
      }
    },
    getFileType: (file, index) => {
      // First file is cover image if coverImageFile exists, rest are item images
      if (coverImageFile && index === 0) {
        return "cover";
      }
      return "item";
    },
  });

  const form = useForm<CreateSorterInput>({
    resolver: zodResolver(createSorterSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: [],
      items: [], // Start with empty array instead of two empty fields
    } as CreateSorterInput,
  });

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

  // Handle item image selection and auto-populate form fields
  const handleItemImagesChange = (files: File[]) => {
    // Get current items and images - DON'T spread to preserve references
    const currentItems = form.getValues("items") || [];

    // Create image data for new files
    const newImageData = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    // Extract item names from filenames
    const newItemTitles = files.map(
      (file) => file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
    );

    // Work with the current arrays directly to preserve references
    const updatedItems = [...currentItems];

    // Clone the images array more carefully to preserve all references
    const updatedImagesData = itemImagesData.slice(); // Use slice() instead of spread
    while (updatedImagesData.length < updatedItems.length) {
      updatedImagesData.push(null);
    }

    let imageIndex = 0;

    // First pass: Replace empty fields that DON'T already have images
    for (let i = 0; i < updatedItems.length && imageIndex < files.length; i++) {
      if (!updatedItems[i].title.trim() && !updatedImagesData[i]) {
        // Replace empty field with image data (only if no existing image)
        updatedItems[i] = { title: newItemTitles[imageIndex], tagSlugs: [] };
        updatedImagesData[i] = newImageData[imageIndex];
        imageIndex++;
      }
    }

    // Second pass: Add remaining images as new fields
    while (imageIndex < files.length) {
      updatedItems.push({ title: newItemTitles[imageIndex], tagSlugs: [] });
      updatedImagesData.push(newImageData[imageIndex]);
      imageIndex++;
    }

    // Update both form and images
    form.setValue("items", updatedItems);
    setItemImagesData(updatedImagesData);
  };

  // Handle file input change
  const handleFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    // Validate files
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    const validFiles: File[] = [];
    const invalidFiles: { file: File; reason: string }[] = [];

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push({ file, reason: "Invalid file type" });
      } else if (file.size > maxSize) {
        invalidFiles.push({ file, reason: "File too large" });
      } else {
        validFiles.push(file);
      }
    });

    // Show feedback about validation results
    if (invalidFiles.length > 0) {
      const typeErrors = invalidFiles.filter(
        ({ reason }) => reason === "Invalid file type",
      ).length;
      const sizeErrors = invalidFiles.filter(
        ({ reason }) => reason === "File too large",
      ).length;

      let errorMessage = `${invalidFiles.length} file(s) rejected: `;
      const errorParts = [];
      if (typeErrors > 0) errorParts.push(`${typeErrors} invalid type(s)`);
      if (sizeErrors > 0) errorParts.push(`${sizeErrors} too large`);
      errorMessage += errorParts.join(", ");
      errorMessage += ". Only JPG, PNG, WebP under 5MB allowed.";

      toast.error(errorMessage);
    }

    if (validFiles.length > 0) {
      if (invalidFiles.length === 0) {
        toast.success(`${validFiles.length} file(s) added successfully`);
      }
      // Pass original files directly - let the upload hook handle image processing
      handleItemImagesChange(validFiles);
    }

    // Reset file input
    if (event.target) {
      event.target.value = "";
    }
  };

  // Clean up preview URLs on component unmount
  useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
      // Clean up item image previews
      itemImagesData.forEach((imageData) => {
        if (imageData) {
          URL.revokeObjectURL(imageData.preview);
        }
      });
    };
  }, [coverImagePreview]); // REMOVED itemImagesData from dependencies!

  // Navigation protection during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading]);

  // Field arrays for items
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

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

  // Add new item (traditional mode)
  const addItemHandler = () => {
    appendItem({ title: "", tagSlugs: [] });
    // Add null entry to images array to keep indices aligned
    setItemImagesData([...itemImagesData, null]);
  };

  // Remove item (traditional mode)
  const removeItemHandler = (index: number) => {
    // Allow removing items even if only 1 or 2 remain
    // Clean up image preview if this item has an image
    const imageData = itemImagesData[index];
    if (imageData) {
      URL.revokeObjectURL(imageData.preview);
    }

    // Remove from images array at the specific index
    const updatedImagesData = [...itemImagesData];
    updatedImagesData.splice(index, 1);
    setItemImagesData(updatedImagesData);

    // Remove from form
    removeItem(index);
  };

  // Upload with progress tracking using axios
  const uploadWithDirectR2 = async (data: CreateSorterInput) => {
    setIsUploading(true);
    setShowProgressDialog(true); // Show dialog immediately when starting upload

    try {
      // Collect all files for upload
      const filesToUpload: File[] = [];

      // Add cover image if present with special prefix to identify it
      if (coverImageFile) {
        // Create a new File with cover prefix to ensure proper type detection
        const coverFile = new File(
          [coverImageFile],
          `cover-${coverImageFile.name}`,
          { type: coverImageFile.type },
        );
        filesToUpload.push(coverFile);
      }

      // Get actual image files from itemImagesData
      const actualImageFiles: File[] = itemImagesData
        .filter(
          (data): data is { file: File; preview: string } => data !== null,
        )
        .map((data) => data.file);

      // CRITICAL FIX: Add unique suffixes to each file for proper correlation
      // This ensures each file can be uniquely identified during processing
      const filesWithUniqueSuffixes = actualImageFiles.map((file) => {
        const uniqueId = generateUniqueId();
        const newFileName = addSuffixToFileName(file.name, uniqueId);
        return new File([file], newFileName, { type: file.type });
      });

      filesToUpload.push(...filesWithUniqueSuffixes);

      if (filesToUpload.length === 0) {
        // No files to upload, use direct creation
        await uploadWithoutImages(data);
        return;
      }

      // Track original files for display purposes (matching the structure of filesToUpload)
      const originalFilesForDisplay: File[] = [];
      // Add original cover file for display
      if (coverImageFile) {
        originalFilesForDisplay.push(coverImageFile);
      }
      // Add original image files for display
      originalFilesForDisplay.push(...actualImageFiles);

      // Upload files to R2 first, passing both processed and original files
      await directUpload.uploadFiles(filesToUpload, originalFilesForDisplay);

      // The onSuccess callback will handle sorter creation
    } catch (error) {
      setIsUploading(false);
      setShowProgressDialog(false);
      console.error("Upload error:", error);
      throw error;
    }
  };

  const createSorterWithUploadedFiles = async (
    data: CreateSorterInput,
    uploadedFiles: UploadedFile[],
    abortController: AbortController | null,
  ) => {
    try {
      console.log("Direct upload sessionId:", directUpload.sessionId);
      console.log("Uploaded files:", uploadedFiles);

      const payload = {
        title: data.title?.trim() || "",
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        uploadSession: directUpload.sessionId,
        uploadedFiles: uploadedFiles,
        // Add tags to payload
        tags: data.tags || [],
      };

      // Filter out empty items
      const validItems =
        data.items
          ?.filter((item) => item.title.trim())
          .map((item) => ({
            title: item.title.trim(),
            tagSlugs: item.tagSlugs || [],
          })) || [];

      Object.assign(payload, { items: validItems });

      // Send sorter creation request with upload session reference
      const response = await fetch("/api/sorters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        let errorMessage = "Failed to create sorter";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // Response is not JSON (likely HTML error page)
          if (response.status === 504) {
            errorMessage =
              "Server timeout - please try again. If the issue persists, try creating a smaller sorter first.";
          } else {
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("API response:", result);

      // Check if request was aborted before showing success
      if (abortController?.signal.aborted) {
        return;
      }

      toast.success("Sorter created successfully!");

      // Clean up local state and redirect - handle different response structures
      // Upload session path: { slug: "...", id: "..." }
      // Tag-based path: { success: true, sorter: { slug: "..." } }
      const slug = result.slug || result.sorter?.slug;
      if (slug) {
        router.refresh(); // Clear router cache so homepage shows new sorter
        router.push(`/sorter/${slug}`);
      } else {
        console.error("No slug found in response:", result);
        toast.error("Sorter created but navigation failed");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Was cancelled
        return;
      }
      setIsUploading(false);
      setShowProgressDialog(false);
      console.error("Error creating sorter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create sorter",
      );
    }
  };

  // Upload without images (direct creation)
  const uploadWithoutImages = async (data: CreateSorterInput) => {
    try {
      const payload = {
        title: data.title?.trim() || "",
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        // Add tags to payload
        tags: data.tags || [],
      };

      // Filter out empty items
      const validItems =
        data.items
          ?.filter((item) => item.title.trim())
          .map((item) => ({
            title: item.title.trim(),
            tagSlugs: item.tagSlugs || [],
          })) || [];

      Object.assign(payload, { items: validItems });

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
      toast.success("Sorter created successfully!");
      router.refresh(); // Clear router cache so homepage shows new sorter
      router.push(`/sorter/${result.sorter.slug}`);
    } catch (error) {
      console.error("Error creating sorter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create sorter",
      );
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setShowProgressDialog(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreateSorterInput) => {
    setIsLoading(true);
    setShowProgressDialog(false); // Reset dialog state
    directUpload.reset(); // Reset upload hook state

    try {
      if (coverImageFile || itemImagesData.some((imageData) => imageData)) {
        // Has images - use upload flow
        await uploadWithDirectR2(data);
      } else {
        // No images - direct creation
        await uploadWithoutImages(data);
      }
    } catch (error) {
      console.error("Error creating sorter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create sorter",
      );
      setIsLoading(false);
      setIsUploading(false);
      setShowProgressDialog(false);
    }
  };

  // Get number of items with images
  const itemsWithImages = itemImagesData.filter((data) => data !== null).length;

  return (
    <div>
      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showProgressDialog || directUpload.isUploading}
        progress={directUpload.progress}
        onCancel={() => {
          // User clicked cancel button
          directUpload.cancel();
          setShowProgressDialog(false);
          setIsUploading(false);
          setIsLoading(false);

          // Form state remains intact - no reset needed

          // Show cancellation feedback
          toast.info("Sorter creation cancelled");
        }}
      />

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

              {/* Cover Image Section */}
              <div className="mb-6">
                <CoverImageUpload
                  selectedFile={coverImageFile}
                  previewUrl={coverImagePreview}
                  onImageSelect={handleCoverImageSelect}
                />
              </div>

              {/* Tags Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">
                  Filter Tags (Optional)
                </h2>
                <TagManagement tags={tags} onTagsChange={handleTagsChange} />
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
                      onClick={addItemHandler}
                      className="flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Items List */}
                <div className="space-y-4">
                  {itemFields.length === 0 ? (
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
                      {itemFields.map((field, index) => (
                        <div key={field.id} className="space-y-0">
                          <FormField
                            control={form.control}
                            name={`items.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  {/* Image preview if available */}
                                  {itemImagesData[index] && (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={itemImagesData[index]!.preview}
                                        alt={`Preview ${index + 1}`}
                                        className="border-border h-10 w-10 rounded border-2 object-cover"
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
                                          addItemHandler();
                                          // Focus will be set after the new item is rendered
                                          setTimeout(() => {
                                            const nextInput =
                                              document.querySelector(
                                                `input[name="items.${itemFields.length}.title"]`,
                                              ) as HTMLInputElement;
                                            nextInput?.focus();
                                          }, 0);
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  {itemFields.length > 0 && (
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

                                {/* Tag selection for this item */}
                                {tags.length > 0 && (
                                  <div className="mb-2 flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                      <Button
                                        key={tag.id}
                                        type="button"
                                        variant={
                                          itemHasTag(index, tag.id)
                                            ? "default"
                                            : "neutral"
                                        }
                                        size="sm"
                                        onClick={() =>
                                          handleItemTagToggle(index, tag.id)
                                        }
                                        className="h-8 text-xs"
                                      >
                                        {tag.name}
                                      </Button>
                                    ))}
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
                  {itemFields.length > 0 && (
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
                        onClick={addItemHandler}
                        className="flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add Item
                      </Button>
                    </div>
                  )}
                </div>

                {/* Items validation error */}
                {(form.formState.errors.items?.root ||
                  form.formState.errors.items?.message) && (
                  <div className="mt-4 text-red-600 dark:text-red-400">
                    {form.formState.errors.items?.root?.message ||
                      form.formState.errors.items?.message}
                  </div>
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
                  {tags.length > 0 && (
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
              <div>
                <Button
                  type="submit"
                  disabled={
                    isLoading || isUploading || directUpload.isUploading
                  }
                  className="w-full md:mt-4"
                >
                  {isLoading || isUploading || directUpload.isUploading
                    ? "Creating..."
                    : "Create Sorter"}
                </Button>
              </div>
            </form>
          </Form>
        </PanelContent>
      </Panel>
    </div>
  );
}
