"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { validateTagName } from "@/lib/utils";
import { toast } from "sonner";

export interface Tag {
  id: string;
  name: string;
  sortOrder: number;
}

interface TagManagementProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  className?: string;
}

interface SortableTagProps {
  tag: Tag;
  onRemove: (id: string) => void;
}

function SortableTag({ tag, onRemove }: SortableTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="inline-flex items-center relative">
      <Badge
        variant="neutral"
        className="inline-flex min-h-8 items-center gap-2 px-3 py-2 pr-8 text-sm cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {/* Drag handle inside badge */}
        <GripVertical size={14} className="text-muted-foreground" />

        {/* Tag name */}
        <span className="select-none">
          {tag.name}
        </span>
      </Badge>
      
      {/* Remove button positioned absolutely - completely outside drag area */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(tag.id);
        }}
        className="text-foreground absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-1 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default function TagManagement({
  tags,
  onTagsChange,
  className = "",
}: TagManagementProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();

    // Validate tag name
    const validation = validateTagName(trimmedValue);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // Check for case-insensitive duplicates
    const exists = tags.some(
      (tag) => tag.name.toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (exists) {
      toast.error("Tag already exists");
      return;
    }

    // Add new tag with next sort order
    const maxSortOrder =
      tags.length > 0 ? Math.max(...tags.map((t) => t.sortOrder)) : -1;
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedValue,
      sortOrder: maxSortOrder + 1,
    };

    onTagsChange([...tags, newTag]);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId);
    // Reorder remaining tags to maintain sequence
    const reorderedTags = updatedTags.map((tag, index) => ({
      ...tag,
      sortOrder: index,
    }));
    onTagsChange(reorderedTags);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tags.findIndex((tag) => tag.id === active.id);
      const newIndex = tags.findIndex((tag) => tag.id === over.id);

      const reorderedTags = arrayMove(tags, oldIndex, newIndex);
      // Update sort order to match new positions
      const updatedTags = reorderedTags.map((tag, index) => ({
        ...tag,
        sortOrder: index,
      }));

      onTagsChange(updatedTags);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Input section */}
        <div className="space-y-2">
          <Label htmlFor="tag-input">
            Add a tag
          </Label>
          <div className="relative max-w-md">
            <Input
              id="tag-input"
              ref={inputRef}
              type="text"
              placeholder="Enter tag here"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12"
            />
            {/* Add icon button with pink background and borders */}
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!inputValue.trim()}
              className="text-foreground bg-main hover:bg-main absolute top-0 right-0 bottom-0 w-10 border-2 border-border rounded-r-[10px] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Help message below input */}
        <p className="text-foreground text-sm">
          Add tags to enable filtering during sorting. For example: album names, seasons, categories, etc.
        </p>

        {/* Tags list */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tags.map((tag) => tag.id)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <SortableTag
                      key={tag.id}
                      tag={tag}
                      onRemove={handleRemoveTag}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <p className="text-foreground text-sm">
              Drag to reorder • Tags will appear in this order during filtering
            </p>
          </div>
        )}

        {tags.length === 0 && (
          <p className="text-muted-foreground text-sm italic">
            No tags added yet. Tags are optional - add them to enable filtering
            during sorting.
          </p>
        )}

        <p className="text-muted-foreground text-sm">
          💡 Untagged items will always appear during sorting
        </p>
      </div>
    </div>
  );
}
