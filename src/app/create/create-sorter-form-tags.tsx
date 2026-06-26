"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { ArcadePageHeader } from "@/components/ui/arcade-page-header";
import { accentFor } from "@/lib/utils";
// Note: Image compression is now handled by the upload hook
import { Plus, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import { track } from "@/lib/analytics";
import CoverImageUpload from "@/components/cover-image-upload";
// Direct-to-final upload flow (no temp sessions)
import { UploadProgressDialog } from "@/components/upload-progress-dialog";
import type { UploadProgress } from "@/types/upload";
import {
  compressImage,
  generateSorterItemSizes,
} from "@/lib/image-compression";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Fire create_started once, on first real engagement with the form.
  const createStartedRef = useRef(false);
  const markCreateStarted = () => {
    if (!createStartedRef.current) {
      createStartedRef.current = true;
      track("create_started");
    }
  };

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

  // Add new item (traditional mode)
  const addItemHandler = () => {
    markCreateStarted();
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

      track("create_completed", {
        itemCount: (data.items || []).length,
      });
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
      track("create_completed", {
        itemCount: (data.items || []).length,
      });
      toast.success("Sorter created successfully!");
      // Invalidate queries to show new sorter immediately
      await invalidateQueriesAfterCreate();
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

      <ArcadePageHeader
        className="mb-8"
        eyebrow="New sorter"
        title="Create a sorter"
        subtitle="Add a title, a cover, and the things you want to rank. Two items minimum — the more the better the fight."
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {/* Sorter Details Section */}
          <section className="rounded-2xl border border-border bg-card p-6 md:p-7">
            <div className="hud mb-5 text-xs text-muted-foreground">
              01 — Details
            </div>
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-semibold text-foreground">
                      Title <span className="text-main-ink">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Best Studio Ghibli Film"
                        {...field}
                        onFocus={markCreateStarted}
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
                    <FormLabel className="text-[13px] font-semibold text-foreground">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What's this sorter about? (optional)"
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
                    <FormLabel className="text-[13px] font-semibold text-foreground">
                      Category
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-muted text-foreground">
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

              {/* Cover Image */}
              <CoverImageUpload
                selectedFile={coverImageFile}
                previewUrl={coverImagePreview}
                onImageSelect={handleCoverImageSelect}
              />
            </div>
          </section>

          {/* Items Section */}
          <section className="rounded-2xl border border-border bg-card p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="hud text-xs text-muted-foreground">
                02 — Items to rank
              </div>
              <span
                className={`font-mono text-xs ${
                  itemFields.length >= 2
                    ? "text-cyan-ink"
                    : "text-muted-foreground"
                }`}
              >
                {itemFields.length} items{" "}
                {itemFields.length >= 2 ? "· ready" : "· min 2"}
              </span>
            </div>
            <div className="mb-4">
              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1"
                >
                  <ImageIcon size={16} />
                  Upload images
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={addItemHandler}
                  className="flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add item
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
                <div className="rounded-[10px] border border-dashed border-border bg-muted/40 px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                  no items yet — add at least two to start a sorter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {itemFields.map((itemField, index) => (
                    <FormField
                      key={itemField.id}
                      control={form.control}
                      name={`items.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="gap-1">
                          <div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted px-3 py-2.5">
                            {/* Color thumb or image preview */}
                            {itemImagesData[index] ? (
                              <img
                                src={itemImagesData[index]!.preview}
                                alt={`Preview ${index + 1}`}
                                className="h-8 w-8 flex-shrink-0 rounded-[7px] border border-border object-cover"
                              />
                            ) : (
                              <span
                                className="h-8 w-8 flex-shrink-0 rounded-[7px]"
                                style={{ background: accentFor(itemField.id || index) }}
                              />
                            )}
                            <FormControl>
                              <Input
                                placeholder={`Item ${index + 1}`}
                                {...field}
                                className="h-auto flex-1 border-0 bg-transparent px-0 py-0 font-semibold text-foreground focus-visible:ring-0"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    // Add new item and focus on it
                                    addItemHandler();
                                    // Focus will be set after the new item is rendered
                                    setTimeout(() => {
                                      const nextInput = document.querySelector(
                                        `input[name="items.${itemFields.length}.title"]`,
                                      ) as HTMLInputElement;
                                      nextInput?.focus();
                                    }, 0);
                                  }
                                }}
                              />
                            </FormControl>
                            {itemFields.length > 0 && (
                              <button
                                type="button"
                                onClick={() => removeItemHandler(index)}
                                title="Remove item"
                                className="flex-shrink-0 px-1 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Add buttons below all items - only show when there's at least one item */}
              {itemFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1"
                  >
                    <ImageIcon size={16} />
                    Upload images
                  </Button>
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={addItemHandler}
                    className="flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add item
                  </Button>
                </div>
              )}
            </div>

            {/* Items validation error */}
            {(form.formState.errors.items?.root ||
              form.formState.errors.items?.message) && (
              <div className="text-destructive mt-4 text-sm">
                {form.formState.errors.items?.root?.message ||
                  form.formState.errors.items?.message}
              </div>
            )}

            {/* Instructions */}
            <div className="mt-5 space-y-1 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Upload images:</strong>{" "}
                Select multiple images to automatically create items. Filename
                (without extension) will be used as the item name. You can still
                change the name after selecting images.
              </p>
              <p>
                <strong className="text-foreground">Add item:</strong> Manually
                add text-only items.
              </p>
              <p className="font-mono text-xs">
                Supported formats: JPG, PNG, WebP &middot; Max 5MB each &middot;
                Empty fields will be replaced first when uploading images
              </p>
            </div>
          </section>

          {/* Footer: errors + submit */}
          <div className="space-y-4 pt-1">
            {/* Form-level validation errors */}
            {form.formState.errors.root && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
                <p className="font-medium">Please fix the following:</p>
                <p className="text-sm">{form.formState.errors.root.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                variant="neutral"
                arcade
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link href="/">Cancel</Link>
              </Button>
              <Button
                type="submit"
                arcade
                size="lg"
                disabled={isLoading || isUploading}
                className="w-full sm:w-auto"
              >
                {(isLoading || isUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLoading || isUploading ? "Creating…" : "▶ Create sorter"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
