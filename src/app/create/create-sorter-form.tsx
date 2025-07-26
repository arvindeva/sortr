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
import { Switch } from "@/components/ui/switch";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SortingBarsLoader } from "@/components/ui/sorting-bars-loader";
import {
  Plus,
  X,
  Camera,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { createSorterSchema, type CreateSorterInput } from "@/lib/validations";
import CoverImageUpload from "@/components/cover-image-upload";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { UploadProgressDialog } from "@/components/upload-progress-dialog";
import type { UploadedFile } from "@/types/upload";

export default function CreateSorterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );
  const [itemImagesData, setItemImagesData] = useState<
    Array<{ file: File; preview: string } | null>
  >([]);
  const [groupImagesData, setGroupImagesData] = useState<
    Array<Array<{ file: File; preview: string } | null>>
  >([]);
  const [groupCoverFiles, setGroupCoverFiles] = useState<Array<File | null>>(
    [],
  );
  const [groupCoverPreviews, setGroupCoverPreviews] = useState<
    Array<string | null>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const groupCoverInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Upload progress state
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Direct upload hook
  const directUpload = useDirectUpload({
    onProgress: (progress) => {
      // Update our progress display
      setShowProgressDialog(true);
      const phaseMessages = {
        'requesting-tokens': 'Preparing upload...',
        'uploading-files': `Uploading files... (${progress.files.filter(f => f.status === 'complete').length}/${progress.files.length})`,
        'creating-sorter': 'Creating sorter...',
        'complete': 'Upload complete!',
        'failed': 'Upload failed'
      };
      setUploadStatus(phaseMessages[progress.phase] || 'Processing...');
    },
    onSuccess: async (uploadedFiles) => {
      // Files uploaded successfully, now create sorter with references
      const formData = form.getValues();
      await createSorterWithUploadedFiles(formData, uploadedFiles);
    },
    onError: (error) => {
      setIsUploading(false);
      setShowProgressDialog(false);
      console.error('Upload error:', error);
    }
  });

  const form = useForm<CreateSorterInput>({
    resolver: zodResolver(createSorterSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      useGroups: false,
      groups: undefined,
      items: [], // Start with empty array instead of two empty fields
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
        updatedItems[i] = { title: newItemTitles[imageIndex] };
        updatedImagesData[i] = newImageData[imageIndex];
        imageIndex++;
      }
    }

    // Second pass: Add remaining images as new fields
    while (imageIndex < files.length) {
      updatedItems.push({ title: newItemTitles[imageIndex] });
      updatedImagesData.push(newImageData[imageIndex]);
      imageIndex++;
    }

    // Update both form and images
    form.setValue("items", updatedItems);
    setItemImagesData(updatedImagesData);
  };

  // Handle file input change
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    // Validate files
    const validFiles = files.filter((file) => {
      // Check file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return false;
      }
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
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
      // Clean up group image previews
      groupImagesData.forEach((groupImages) => {
        groupImages.forEach((imageData) => {
          if (imageData) {
            URL.revokeObjectURL(imageData.preview);
          }
        });
      });
      // Clean up group cover previews
      groupCoverPreviews.forEach((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [coverImagePreview]); // REMOVED itemImagesData and groupImagesData from dependencies!

  // Initialize groups when switching to groups mode
  useEffect(() => {
    if (useGroups) {
      // Initialize groups array as empty (user will add groups manually)
      const currentGroups = form.getValues("groups");
      if (!currentGroups) {
        form.setValue("groups", []);
        // Initialize empty grouped images data
        setGroupImagesData([]);
        // Initialize empty group cover images
        setGroupCoverFiles([]);
        setGroupCoverPreviews([]);
        // Initialize empty file input refs arrays
        groupFileInputRefs.current = [];
        groupCoverInputRefs.current = [];
      }
      // Clear items array when using groups
      form.setValue("items", undefined);
      // Clear traditional mode images data
      setItemImagesData([]);
    } else {
      // Clear groups when not using them
      form.setValue("groups", undefined);
      // Initialize items if they don't exist (start with empty array)
      if (!form.getValues("items")) {
        form.setValue("items", []);
      }
      // Clear grouped images data
      setGroupImagesData([]);
      setGroupCoverFiles([]);
      setGroupCoverPreviews([]);
      groupFileInputRefs.current = [];
      groupCoverInputRefs.current = [];
    }
  }, [useGroups, form]);

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
    // Add corresponding image data for new group
    setGroupImagesData((prev) => [...prev, [null, null]]);
    // Add group cover image data
    setGroupCoverFiles((prev) => [...prev, null]);
    setGroupCoverPreviews((prev) => [...prev, null]);
    // Add file input refs for new group
    groupFileInputRefs.current.push(null);
    groupCoverInputRefs.current.push(null);
  };

  // Remove group
  const removeGroupHandler = (index: number) => {
    if (groupFields.length > 1) {
      // Clean up image previews for this group
      const groupImages = groupImagesData[index];
      if (groupImages) {
        groupImages.forEach((imageData) => {
          if (imageData) {
            URL.revokeObjectURL(imageData.preview);
          }
        });
      }
      // Clean up group cover preview
      const coverPreview = groupCoverPreviews[index];
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }

      removeGroup(index);
      // Remove corresponding image data
      setGroupImagesData((prev) => prev.filter((_, i) => i !== index));
      setGroupCoverFiles((prev) => prev.filter((_, i) => i !== index));
      setGroupCoverPreviews((prev) => prev.filter((_, i) => i !== index));
      // Remove file input refs
      groupFileInputRefs.current.splice(index, 1);
      groupCoverInputRefs.current.splice(index, 1);
    }
  };

  // Move group up
  const moveGroupUp = (index: number) => {
    if (index > 0) {
      moveGroup(index, index - 1);
      // Move corresponding image data
      setGroupImagesData((prev) => {
        const newData = [...prev];
        [newData[index], newData[index - 1]] = [
          newData[index - 1],
          newData[index],
        ];
        return newData;
      });
      // Move group cover data
      setGroupCoverFiles((prev) => {
        const newData = [...prev];
        [newData[index], newData[index - 1]] = [
          newData[index - 1],
          newData[index],
        ];
        return newData;
      });
      setGroupCoverPreviews((prev) => {
        const newData = [...prev];
        [newData[index], newData[index - 1]] = [
          newData[index - 1],
          newData[index],
        ];
        return newData;
      });
      // Move file input refs
      [
        groupFileInputRefs.current[index],
        groupFileInputRefs.current[index - 1],
      ] = [
        groupFileInputRefs.current[index - 1],
        groupFileInputRefs.current[index],
      ];
      [
        groupCoverInputRefs.current[index],
        groupCoverInputRefs.current[index - 1],
      ] = [
        groupCoverInputRefs.current[index - 1],
        groupCoverInputRefs.current[index],
      ];
    }
  };

  // Move group down
  const moveGroupDown = (index: number) => {
    if (index < groupFields.length - 1) {
      moveGroup(index, index + 1);
      // Move corresponding image data
      setGroupImagesData((prev) => {
        const newData = [...prev];
        [newData[index], newData[index + 1]] = [
          newData[index + 1],
          newData[index],
        ];
        return newData;
      });
      // Move group cover data
      setGroupCoverFiles((prev) => {
        const newData = [...prev];
        [newData[index], newData[index + 1]] = [
          newData[index + 1],
          newData[index],
        ];
        return newData;
      });
      setGroupCoverPreviews((prev) => {
        const newData = [...prev];
        [newData[index], newData[index + 1]] = [
          newData[index + 1],
          newData[index],
        ];
        return newData;
      });
      // Move file input refs
      [
        groupFileInputRefs.current[index],
        groupFileInputRefs.current[index + 1],
      ] = [
        groupFileInputRefs.current[index + 1],
        groupFileInputRefs.current[index],
      ];
      [
        groupCoverInputRefs.current[index],
        groupCoverInputRefs.current[index + 1],
      ] = [
        groupCoverInputRefs.current[index + 1],
        groupCoverInputRefs.current[index],
      ];
    }
  };

  // Add new item to specific group
  const addItemToGroup = (groupIndex: number) => {
    const currentItems = form.getValues(`groups.${groupIndex}.items`);
    form.setValue(`groups.${groupIndex}.items`, [
      ...currentItems,
      { title: "" },
    ]);
    // Add null entry to images array for this group
    setGroupImagesData((prev) => {
      const newData = [...prev];
      if (newData[groupIndex]) {
        newData[groupIndex] = [...newData[groupIndex], null];
      }
      return newData;
    });
  };

  // Remove item from specific group
  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    const currentItems = form.getValues(`groups.${groupIndex}.items`);
    if (currentItems.length > 1) {
      // Clean up image preview if this item has an image
      const imageData = groupImagesData[groupIndex]?.[itemIndex];
      if (imageData) {
        URL.revokeObjectURL(imageData.preview);
      }

      form.setValue(
        `groups.${groupIndex}.items`,
        currentItems.filter((_, i) => i !== itemIndex),
      );
      // Remove from images array at the specific index
      setGroupImagesData((prev) => {
        const newData = [...prev];
        if (newData[groupIndex]) {
          newData[groupIndex] = newData[groupIndex].filter(
            (_, i) => i !== itemIndex,
          );
        }
        return newData;
      });
    }
  };

  // Handle group image selection and auto-populate form fields
  const handleGroupImagesChange = (groupIndex: number, files: File[]) => {
    // Get current group items
    const currentItems = form.getValues(`groups.${groupIndex}.items`) || [];

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

    // Get current group images data
    const currentGroupImages = groupImagesData[groupIndex] || [];
    const updatedImagesData = currentGroupImages.slice();
    while (updatedImagesData.length < updatedItems.length) {
      updatedImagesData.push(null);
    }

    let imageIndex = 0;

    // First pass: Replace empty fields that DON'T already have images
    for (let i = 0; i < updatedItems.length && imageIndex < files.length; i++) {
      if (!updatedItems[i].title.trim() && !updatedImagesData[i]) {
        // Replace empty field with image data (only if no existing image)
        updatedItems[i] = { title: newItemTitles[imageIndex] };
        updatedImagesData[i] = newImageData[imageIndex];
        imageIndex++;
      }
    }

    // Second pass: Add remaining images as new fields
    while (imageIndex < files.length) {
      updatedItems.push({ title: newItemTitles[imageIndex] });
      updatedImagesData.push(newImageData[imageIndex]);
      imageIndex++;
    }

    // Update both form and group images
    form.setValue(`groups.${groupIndex}.items`, updatedItems);
    setGroupImagesData((prev) => {
      const newData = [...prev];
      newData[groupIndex] = updatedImagesData;
      return newData;
    });
  };

  // Handle file input change for groups
  const handleGroupFileInputChange = (
    groupIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    // Validate files (reuse existing validation logic)
    const validFiles = files.filter((file) => {
      // Check file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return false;
      }
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      handleGroupImagesChange(groupIndex, validFiles);
    }

    // Reset file input
    if (event.target) {
      event.target.value = "";
    }
  };

  // Handle group cover image selection
  const handleGroupCoverImageSelect = (
    groupIndex: number,
    file: File | null,
  ) => {
    // Clean up previous preview
    const oldPreview = groupCoverPreviews[groupIndex];
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }

    // Update file
    setGroupCoverFiles((prev) => {
      const newFiles = [...prev];
      newFiles[groupIndex] = file;
      return newFiles;
    });

    // Update preview
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setGroupCoverPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[groupIndex] = previewUrl;
        return newPreviews;
      });
    } else {
      setGroupCoverPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[groupIndex] = null;
        return newPreviews;
      });
    }
  };

  // Handle group cover image file input change
  const handleGroupCoverFileInputChange = (
    groupIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;

    if (file) {
      // Validate file (same as cover image validation)
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        alert("Only JPG, PNG, and WebP files are allowed");
        return;
      }

      if (file.size > maxSize) {
        alert("File size must be less than 10MB");
        return;
      }
    }

    handleGroupCoverImageSelect(groupIndex, file);

    // Reset file input
    if (event.target) {
      event.target.value = "";
    }
  };

  // Add new item (traditional mode)
  const addItemHandler = () => {
    appendItem({ title: "" });
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
    setUploadStatus("Preparing upload...");

    try {
      // Safety check for required fields
      if (!data.title || !data.title.trim()) {
        throw new Error("Title is required");
      }

      // Collect all files for upload
      const filesToUpload: File[] = [];

      // Add cover image if present
      if (coverImageFile) {
        filesToUpload.push(coverImageFile);
      }

      // Get actual image files from itemImagesData (traditional mode) or groupImagesData (grouped mode)
      let actualImageFiles: File[] = [];

      if (data.useGroups) {
        // Flatten grouped images into a single array
        actualImageFiles = groupImagesData
          .flat()
          .filter(
            (data): data is { file: File; preview: string } => data !== null,
          )
          .map((data) => data.file);
      } else {
        // Traditional mode
        actualImageFiles = itemImagesData
          .filter(
            (data): data is { file: File; preview: string } => data !== null,
          )
          .map((data) => data.file);
      }

      filesToUpload.push(...actualImageFiles);

      // Get group cover files (only for grouped mode)
      if (data.useGroups) {
        const groupCoverImageFiles = groupCoverFiles.filter(
          (file) => file !== null,
        ) as File[];
        filesToUpload.push(...groupCoverImageFiles);
      }

      if (filesToUpload.length === 0) {
        // No files to upload, use direct creation
        await uploadWithoutImages(data);
        return;
      }

      // Upload files to R2 first
      await directUpload.uploadFiles(filesToUpload);

      // The onSuccess callback will handle sorter creation
      
    } catch (error) {
      setIsUploading(false);
      setShowProgressDialog(false);
      console.error("Upload error:", error);
      throw error;
    }
  };

  const createSorterWithUploadedFiles = async (data: CreateSorterInput, uploadedFiles: UploadedFile[]) => {
    try {
      setUploadStatus("Creating sorter...");

      const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      category: data.category?.trim() || undefined,
      useGroups: data.useGroups,
      uploadSession: directUpload.sessionId,
      uploadedFiles: uploadedFiles
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

      // Get actual image files from itemImagesData (traditional mode) or groupImagesData (grouped mode)
      let actualImageFiles: File[] = [];

      if (data.useGroups) {
        // Flatten grouped images into a single array
        actualImageFiles = groupImagesData
          .flat()
          .filter(
            (data): data is { file: File; preview: string } => data !== null,
          )
          .map((data) => data.file);
      } else {
        // Traditional mode
        actualImageFiles = itemImagesData
          .filter(
            (data): data is { file: File; preview: string } => data !== null,
          )
          .map((data) => data.file);
      }

      setUploadStatus("Creating sorter...");
      
      // Send sorter creation request with upload session reference
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
      
      setUploadStatus("Upload complete!");
      setShowProgressDialog(false);
      setIsUploading(false);
      
      // Clean up local state and redirect
      router.push(`/sorter/${result.slug}`);
    } catch (error) {
      setIsUploading(false);
      setShowProgressDialog(false);
      console.error("Error creating sorter:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to create sorter";
      alert(errorMessage);
    }
  };

  // Fast upload for text-only sorters (existing behavior)
  const uploadWithoutImages = async (data: CreateSorterInput) => {
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

      // Send as regular JSON
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

      // Redirect to sorter page (keep loading state during redirect)
      router.push(`/sorter/${result.sorter.slug}`);
    } catch (error) {
      console.error("Error creating sorter:", error);
      alert(error instanceof Error ? error.message : "Failed to create sorter");
      setIsLoading(false); // Only set loading false on error
    }
  };

  // Handle form submission with smart upload detection
  const onSubmit = async (data: CreateSorterInput) => {
    // Get actual image files from itemImagesData (traditional mode) or groupImagesData (grouped mode)
    let actualImageFiles: File[] = [];

    if (data.useGroups) {
      // Flatten grouped images into a single array
      actualImageFiles = groupImagesData
        .flat()
        .filter(
          (data): data is { file: File; preview: string } => data !== null,
        )
        .map((data) => data.file);
    } else {
      // Traditional mode
      actualImageFiles = itemImagesData
        .filter(
          (data): data is { file: File; preview: string } => data !== null,
        )
        .map((data) => data.file);
    }

    // Get group cover files (only for grouped mode)
    let groupCoverImageFiles: File[] = [];
    if (data.useGroups) {
      groupCoverImageFiles = groupCoverFiles.filter(
        (file) => file !== null,
      ) as File[];
    }

    // Check if any images are present
    const hasImages = 
      coverImageFile || 
      actualImageFiles.length > 0 || 
      groupCoverImageFiles.length > 0;

    if (hasImages) {
      // Use direct R2 upload for image uploads
      await uploadWithDirectR2(data);
    } else {
      // Use existing fast JSON upload for text-only sorters
      await uploadWithoutImages(data);
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
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                  e.preventDefault();
                }
              }}
              className="space-y-6"
            >
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
                              Use Groups
                            </FormLabel>
                            <div className="font-medium">
                              Filter items into groups for selective sorting
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
              </div>

              {/* Items to Rank Section */}
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Items to Rank</h2>
                {useGroups ? (
                  /* Groups Mode */
                  <div>
                    <div className="mb-4">
                      <FormLabel>Groups *</FormLabel>
                      {/* Add Group button */}
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="neutral"
                          size="sm"
                          onClick={addGroup}
                          className="flex items-center gap-1"
                        >
                          <Plus size={16} />
                          Add Group
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {groupFields.length === 0 ? (
                        <div className="py-8 text-center">
                          <p>No groups added yet</p>
                          <p className="mt-1 text-sm">
                            Click "Add Group" to get started
                          </p>
                        </div>
                      ) : (
                        <>
                          {groupFields.map((groupField, groupIndex) => (
                            <div key={groupField.id} className="space-y-4">
                              {/* Group Number Heading */}
                              <h3 className="text-lg font-semibold">
                                Group {groupIndex + 1}
                              </h3>

                              {/* Group Name Field */}
                              <div className="relative ml-6">
                                {/* Up/Down arrows - positioned absolutely */}
                                <div className="absolute top-6 -left-8 flex flex-col gap-1">
                                  <Button
                                    type="button"
                                    variant="neutral"
                                    size="sm"
                                    onClick={() => moveGroupUp(groupIndex)}
                                    title="Move group up"
                                    disabled={groupIndex === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronUp size={14} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="neutral"
                                    size="sm"
                                    onClick={() => moveGroupDown(groupIndex)}
                                    title="Move group down"
                                    disabled={
                                      groupIndex === groupFields.length - 1
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronDown size={14} />
                                  </Button>
                                </div>

                                <div>
                                  <FormLabel>Group Name</FormLabel>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  {/* Group Cover Image Preview */}
                                  {groupCoverPreviews[groupIndex] && (
                                    <div className="border-border rounded-base h-10 w-10 flex-shrink-0 overflow-hidden border-2">
                                      <img
                                        src={groupCoverPreviews[groupIndex]!}
                                        alt="Group cover preview"
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  )}

                                  {/* Group Name Input */}
                                  <FormField
                                    control={form.control}
                                    name={`groups.${groupIndex}.name`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormControl>
                                          <Input
                                            placeholder="Group name"
                                            {...field}
                                            className="font-medium"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Upload Group Image Button */}
                                  <Button
                                    type="button"
                                    variant="neutral"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() =>
                                      groupCoverInputRefs.current[
                                        groupIndex
                                      ]?.click()
                                    }
                                    title="Upload group cover image"
                                  >
                                    <Camera size={14} />
                                    Group Image
                                  </Button>
                                  {/* Hidden file input for group cover */}
                                  <input
                                    ref={(el) => {
                                      groupCoverInputRefs.current[groupIndex] =
                                        el;
                                    }}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                      handleGroupCoverFileInputChange(
                                        groupIndex,
                                        e,
                                      )
                                    }
                                    className="hidden"
                                  />

                                  {/* Delete Group Button */}
                                  {groupFields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="neutralNoShadow"
                                      size="sm"
                                      onClick={() =>
                                        removeGroupHandler(groupIndex)
                                      }
                                      title="Remove group"
                                      className="h-6 w-6 p-0"
                                    >
                                      <X size={14} />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Group Items Field */}
                              <div className="ml-6">
                                <FormLabel>Group Items</FormLabel>
                                <div className="mt-1 space-y-2">
                                  {/* Upload Images Button */}
                                  <div>
                                    <Button
                                      type="button"
                                      variant="neutral"
                                      size="sm"
                                      className="flex items-center gap-1"
                                      onClick={() =>
                                        groupFileInputRefs.current[
                                          groupIndex
                                        ]?.click()
                                      }
                                    >
                                      <ImageIcon size={16} />
                                      Upload Images
                                    </Button>
                                    {/* Hidden file input for this group */}
                                    <input
                                      ref={(el) => {
                                        groupFileInputRefs.current[groupIndex] =
                                          el;
                                      }}
                                      type="file"
                                      multiple
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={(e) =>
                                        handleGroupFileInputChange(
                                          groupIndex,
                                          e,
                                        )
                                      }
                                      className="hidden"
                                    />
                                  </div>

                                  {/* Items List */}
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
                                                {/* Image thumbnail */}
                                                {groupImagesData[groupIndex]?.[
                                                  itemIndex
                                                ] && (
                                                  <div className="flex-shrink-0">
                                                    <img
                                                      src={
                                                        groupImagesData[
                                                          groupIndex
                                                        ][itemIndex]!.preview
                                                      }
                                                      alt={`Preview ${itemIndex + 1}`}
                                                      className="border-border rounded-base h-10 w-10 border-2 object-cover"
                                                    />
                                                  </div>
                                                )}
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
                                      className="flex items-center gap-1"
                                    >
                                      <Plus size={14} />
                                      Add Item
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Group button below all groups */}
                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="neutral"
                              size="sm"
                              onClick={addGroup}
                              className="flex items-center gap-1"
                            >
                              <Plus size={16} />
                              Add Group
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 space-y-1 text-sm">
                      <p>
                        <strong>Group Image:</strong> Upload a cover image for
                        each group. Click "Group Image" button to select an
                        image. Item with no image will use group image as
                        placeholder.
                      </p>
                      <p>
                        <strong>Upload Images:</strong> Select multiple images
                        to automatically create items for a group. Filename
                        (without extension) will be used as the item name. You
                        can still change the name after selecting images.
                      </p>
                      <p>
                        <strong>Add Item:</strong> Manually add text-only items.
                      </p>
                      <p className="text-xs">
                        Supported formats: JPG, PNG, WebP • Max 5MB each •
                        Images are optional for both groups and items
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Traditional Mode */
                  <div>
                    <div className="mb-4">
                      <FormLabel>Items *</FormLabel>
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

                    <div className="space-y-2">
                      {itemFields.length === 0 ? (
                        <div className="py-8 text-center">
                          <p>No items added yet</p>
                          <p className="mt-1 text-sm">
                            Click "Upload Images" or "Add Item" to get started
                          </p>
                        </div>
                      ) : (
                        <>
                          {itemFields.map((field, index) => (
                            <FormField
                              key={field.id}
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
                                </FormItem>
                              )}
                            />
                          ))}
                          {/* Add Item button below all items */}
                          <div className="pt-2">
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
                        </>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 space-y-1 text-sm">
                      <p>
                        <strong>Upload Images:</strong> Select multiple images
                        to automatically create items. Filename (without
                        extension) will be used as the item name. You can still
                        change the name after selecting images.
                      </p>
                      <p>
                        <strong>Add Item:</strong> Manually add text-only items.
                      </p>
                      <p className="text-xs">
                        Supported formats: JPG, PNG, WebP • Max 5MB each • Empty
                        fields will be replaced first when uploading images
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading || isUploading || directUpload.isUploading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Sorter"}
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => router.back()}
                  disabled={isLoading || isUploading || directUpload.isUploading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </PanelContent>
      </Panel>

      {/* Upload Progress Dialog */}
      <UploadProgressDialog 
        open={showProgressDialog || directUpload.isUploading}
        progress={directUpload.progress}
        onOpenChange={() => {}}
      />

      {/* Fallback for non-upload operations */}
      {showProgressDialog && !directUpload.isUploading && (
        <Dialog open={showProgressDialog} onOpenChange={() => {}}>
          <DialogContent preventClose={true} className="sm:max-w-md">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle>Creating Sorter</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 text-center">
              <SortingBarsLoader size={60} />
              <p className="text-sm">{uploadStatus}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
