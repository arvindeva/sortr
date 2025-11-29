"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { Plus, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import { generateUniqueId, addSuffixToFileName } from "@/lib/utils";
import CoverImageUpload from "@/components/cover-image-upload";
// Direct-to-final upload flow (no temp sessions)
import { UploadProgressDialog } from "@/components/upload-progress-dialog";
import type { UploadProgress } from "@/types/upload";
import {
  compressImage,
  generateSorterItemSizes,
} from "@/lib/image-compression";
import TagManagement, { type Tag } from "@/components/tag-management";
import { toast } from "sonner";

export default function CreateSorterFormTags() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to invalidate all relevant queries after sorter creation
  const invalidateQueriesAfterCreate = async () => {
    // Always invalidate homepage and browse page
    await queryClient.invalidateQueries({
      queryKey: ["homepage", "popular-sorters"],
    });
    await queryClient.invalidateQueries({ queryKey: ["browse"] });

    // Invalidate user profile and user data queries
    if (session?.user?.email) {
      // Invalidate user data query (used by navbar)
      await queryClient.invalidateQueries({
        queryKey: ["user", session.user.email],
      });

      // Invalidate all user profile queries (catch any username-based queries)
      await queryClient.invalidateQueries({
        queryKey: ["user"],
        predicate: (query) => {
          // Invalidate any query that starts with ["user", ...] and isn't an email
          const queryKey = query.queryKey;
          return (
            queryKey.length >= 2 &&
            queryKey[0] === "user" &&
            typeof queryKey[1] === "string" &&
            !queryKey[1].includes("@")
          );
        },
      });
    }
  };
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

  // Local upload progress (reuses dialog UI)
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

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
      return;
    }

    // Use tag name for now - the backend will convert to slugs
    const currentTagSlugs = currentItem.tagSlugs || [];

    let newTagSlugs: string[];
    if (currentTagSlugs.includes(tag.name)) {
      // Remove tag
      newTagSlugs = currentTagSlugs.filter((name) => name !== tag.name);
    } else {
      // Add tag
      newTagSlugs = [...currentTagSlugs, tag.name];
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

  // Upload directly to final keys using presigned PUT URLs
  const uploadWithDirectR2 = async (data: CreateSorterInput) => {
    setIsUploading(true);
    setShowProgressDialog(true); // Show dialog immediately when starting upload

    try {
      // 1) Build init payload
      const validItems =
        data.items
          ?.map((item, idx) => ({
            title: item.title.trim(),
            tagNames: item.tagSlugs || [],
            hasImage: !!itemImagesData[idx],
          }))
          .filter((i) => i.title.length > 0) || [];

      const initRes = await fetch("/api/sorters/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title?.trim() || "",
          description: data.description?.trim() || null,
          category: data.category?.trim() || null,
          tags: data.tags || [],
          items: validItems,
          includeCover: !!coverImageFile,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || `Init failed (${initRes.status})`);
      }

      const initData = await initRes.json();
      const { sorterId, uploadBatchId, slug, keys, presigned } = initData as {
        sorterId: string;
        uploadBatchId: string;
        slug: string;
        keys: Array<{ key: string; type: string; itemIndex?: number }>;
        presigned: Record<string, string>;
      };

      // 2) Prepare files for upload
      type Task = { name: string; key: string; file: File };
      const tasks: Task[] = [];

      // Cover
      if (coverImageFile) {
        const coverKey = keys.find((k) => k.type === "cover")?.key;
        if (coverKey) {
          const c = await compressImage(coverImageFile, {
            quality: 0.9,
            maxWidth: 600,
            maxHeight: 600,
            format: "jpeg",
          });
          tasks.push({
            name: coverImageFile.name,
            key: coverKey,
            file: c.file,
          });
        }
      }

      // Items (use index mapping and image-compression to make thumb + full)
      for (let i = 0; i < itemImagesData.length; i++) {
        const img = itemImagesData[i];
        if (!img) continue; // text-only item
        const mainKey = keys.find(
          (k: any) => k.type === "item" && k.itemIndex === i,
        )?.key;
        const thumbKey = keys.find(
          (k: any) => k.type === "thumb" && k.itemIndex === i,
        )?.key;
        if (!mainKey || !thumbKey) continue; // should not happen

        const { thumbnail, full } = await generateSorterItemSizes(img.file, {
          quality: 0.9,
          format: "jpeg",
        });
        tasks.push({
          name: `${img.file.name} (thumb)`,
          key: thumbKey,
          file: thumbnail.file,
        });
        tasks.push({
          name: `${img.file.name} (full)`,
          key: mainKey,
          file: full.file,
        });
      }

      // 3) Upload with progress
      uploadAbortRef.current = new AbortController();
      const abortSignal = uploadAbortRef.current.signal;

      setProgress({
        phase: "uploading-files",
        files: tasks.map((t) => ({
          name: t.name,
          progress: 0,
          status: "pending",
        })),
        overallProgress: 0,
        statusMessage: "Uploading images to R2...",
        determinate: true,
      });

      let completed = 0;
      const update = (
        idx: number,
        status: "uploading" | "complete" | "failed",
      ) => {
        setProgress((prev) => {
          if (!prev) return prev;
          const files = [...prev.files];
          files[idx] = {
            ...files[idx],
            status,
            progress: status === "complete" ? 100 : files[idx].progress,
          };
          const overall = Math.round(
            (files.filter((f) => f.status === "complete").length /
              files.length) *
              100,
          );
          return { ...prev, files, overallProgress: overall };
        });
      };

      const CONCURRENCY = 5;
      const queue = tasks.map((t, index) => ({ ...t, index }));
      async function put(url: string, file: File) {
        const res = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "image/jpeg" },
          signal: abortSignal,
        });
        if (!res.ok) throw new Error(`Upload failed ${res.status}`);
      }
      let cursor = 0;
      async function worker() {
        while (cursor < queue.length) {
          const my = cursor++;
          const t = queue[my];
          try {
            update(t.index, "uploading");
            await put(presigned[t.key], t.file);
            completed++;
            update(t.index, "complete");
          } catch (e) {
            update(t.index, "failed");
            throw e;
          }
        }
      }
      const workers = Array(Math.min(CONCURRENCY, queue.length))
        .fill(0)
        .map(() => worker());
      try {
        await Promise.all(workers);
      } catch (e: any) {
        // Swallow user-initiated cancel aborts
        if (
          e === "USER_CANCEL" ||
          e?.name === "AbortError" ||
          e?.message?.includes("aborted") ||
          e?.message?.includes("signal is aborted")
        ) {
          return; // gracefully exit upload flow
        }
        throw e;
      }

      // 4) Finalize
      setProgress(
        (prev) =>
          prev && {
            ...prev,
            phase: "creating-sorter",
            statusMessage: "Finalizing sorter...",
            determinate: false,
          },
      );

      const finRes = await fetch(`/api/sorters/${sorterId}/finalize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadBatchId }),
        signal: AbortSignal.timeout(300000),
      });
      if (finRes.status === 409) {
        const p = await finRes.json();
        throw new Error(
          `Missing ${p.missing?.length || 0} files. Please retry.`,
        );
      }
      if (!finRes.ok) {
        const err = await finRes.json().catch(() => ({}));
        throw new Error(err.error || `Finalize failed (${finRes.status})`);
      }

      toast.success("Sorter created successfully!");
      setProgress({
        phase: "complete",
        files: tasks.map((t) => ({
          name: t.name,
          progress: 100,
          status: "complete",
        })),
        overallProgress: 100,
        statusMessage: "Redirecting to sorter...",
        determinate: false,
      });

      // Invalidate queries to show new sorter immediately
      await invalidateQueriesAfterCreate();
      router.refresh();
      router.push(`/sorter/${slug}`);
    } catch (error: any) {
      setIsUploading(false);
      setShowProgressDialog(false);
      // Ignore abort-related errors triggered by user cancel
      if (
        error?.name === "AbortError" ||
        error?.message?.includes("aborted") ||
        error?.message?.includes("signal is aborted")
      ) {
        return;
      }
      console.error("Upload error:", error);
      throw error;
    }
  };

  // Remove legacy upload-with-session flow (replaced by direct-to-final)

  // Handle form submission
  const onSubmit = async (data: CreateSorterInput) => {
    setIsLoading(true);
    setShowProgressDialog(false); // Reset dialog state
    // Reset local upload state
    setProgress(null);

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

  // Fallback: create sorter without images (legacy path)
  async function uploadWithoutImages(data: CreateSorterInput) {
    try {
      const payload = {
        title: data.title?.trim() || "",
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        tags: data.tags || [],
        items: (data.items || [])
          .filter((i) => i.title.trim())
          .map((i) => ({ title: i.title.trim(), tagSlugs: i.tagSlugs || [] })),
      };

      const res = await fetch("/api/sorters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create failed (${res.status})`);
      }
      const out = await res.json();
      toast.success("Sorter created successfully!");
      // Invalidate queries to show new sorter immediately
      await invalidateQueriesAfterCreate();
      router.refresh();
      router.push(`/sorter/${out.slug || out.sorter?.slug}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showProgressDialog || isUploading}
        progress={progress}
        onCancel={() => {
          // User clicked cancel button
          if (uploadAbortRef.current) {
            try {
              // Provide a simple reason string; avoid throwing in dev overlay
              uploadAbortRef.current.abort("USER_CANCEL");
            } catch {}
          }
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
                                        className="border-border h-10 w-10 rounded border-2 object-contain"
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
                  disabled={isLoading || isUploading}
                  className="w-full md:mt-4"
                >
                  {(isLoading || isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading || isUploading ? "Creating..." : "Create Sorter"}
                </Button>
              </div>
            </form>
          </Form>
        </PanelContent>
      </Panel>
    </div>
  );
}
