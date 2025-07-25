# Editable Sorters Implementation Plan

## Problem Statement

When sorter creators edit their sorters (rename items, delete items, add items, change sorter title, update cover image), existing rankings reference the old data structure, potentially causing:

- **Broken references**: Rankings pointing to deleted items
- **Missing images**: Deleted images still referenced in rankings
- **Inconsistent display**: Old item names vs. new item names, outdated sorter titles, changed cover images
- **Data corruption**: Rankings becoming meaningless and losing historical accuracy

## Solution Approaches Analyzed

### Option 1: Immutable Snapshots (RECOMMENDED)

- **Rankings store complete sorter and item data** at the time of sorting
- Rankings become self-contained with sorter title, cover image, item names, images, descriptions
- **Pros**: Perfect data integrity, rankings never break, complete historical accuracy
- **Cons**: Storage overhead, data duplication

### Option 2: Versioned Sorters

- Create new sorter version on each edit
- Rankings reference specific sorter version
- **Pros**: Clean separation, edit history
- **Cons**: Complex version management, storage growth

### Option 3: Soft Deletion with Archiving

- Never actually delete items, just mark as "archived"
- Rankings continue to reference archived items
- **Pros**: No broken references, edit flexibility
- **Cons**: Database bloat, complex queries

### Option 4: Migration Strategy

- When items are deleted, remove them from affected rankings
- Update rankings to reflect current state
- **Pros**: Clean data, reflects current sorter
- **Cons**: Rankings change unexpectedly, user confusion

### Option 5: Hybrid Approach

- Store essential data (name, image URL) in rankings
- Reference items by ID for live updates
- Fall back to stored data if item is deleted
- **Pros**: Balance of integrity and freshness
- **Cons**: Complex logic, partial solutions

## Recommended Implementation: Immutable Snapshots

### Core Concept

Store complete sorter and item data in `sortingResults` table at the time ranking is created. Rankings become permanent historical records that never break, preserving exactly what users saw when they created their rankings.

### Database Schema Changes

#### Current Implementation Status

**✅ ITEM-LEVEL SNAPSHOTS ALREADY IMPLEMENTED**

- `sortingResults.rankings` JSON already stores complete item data: `id`, `title`, `imageUrl`
- Item snapshots working correctly and maintaining historical accuracy

**❌ MISSING SORTER-LEVEL SNAPSHOTS**

- Sorter title and cover image currently fetched live from `sorters` table
- Rankings break historical accuracy when sorters are edited

#### Required Schema Updates

**Add new fields to `sortingResults` table:**

```sql
ALTER TABLE sorting_results
ADD COLUMN sorter_title TEXT,
ADD COLUMN sorter_cover_image_url TEXT;
```

#### Current `sortingResults.rankings` JSON (Item snapshots already working):

```json
{
  "rankings": [
    {
      "id": "item-123",
      "rank": 1,
      "title": "Item Name at Time of Ranking",
      "imageUrl": "https://example.com/image.jpg"
    }
  ]
}
```

#### Complete Snapshot Solution:

- **Sorter-level**: Store `sorter_title` and `sorter_cover_image_url` in database columns
- **Item-level**: Continue using existing `rankings` JSON with item snapshots

### Implementation Steps

#### Phase 1: Complete Sorter-Level Snapshots (HIGH PRIORITY)

1. **Database Schema**: Add `sorter_title` and `sorter_cover_image_url` columns to `sortingResults`
2. **Update Ranking Save API**: Capture current sorter title and cover image when saving rankings
3. **Update Rankings Display**: Use snapshot data instead of live sorter data with fallback for backward compatibility
4. **Data Migration**: Populate existing rankings with current sorter title and cover image

#### Phase 2: Sorter Editing Implementation (AFTER PHASE 1)

1. **Create sorter edit UI** and API endpoints for title, description, cover image, items
2. **Implement item management** (add, edit, delete, reorder)
3. **Handle image uploads** and cleanup for both cover and item images
4. **Add edit history** and modification tracking

## Edit Implementation Strategy

### Content-Based Matching Approach (SELECTED)

After analyzing implementation approaches for sorter editing, **content-based matching** was selected over ID-based operations for the following reasons:

#### Approach Overview

**Frontend**: Reuse the existing create sorter form with pre-populated data. On submit, send complete current state (no ID tracking required).

**Backend**: Intelligently match payload items against existing database items using a multi-pass algorithm to determine what changed.

#### Matching Algorithm

```typescript
// Multi-pass matching algorithm (designed for easy addition of new matching passes):
1. **Exact Match**: Match by (title + imageUrl) → Keep unchanged
2. **Image Match**: Match by imageUrl only → Update title  
3. **Title Match**: Match by title only → Update image
4. **Fuzzy Match**: Match by title similarity → Update with confidence score
5. **Create New**: Remaining unmatched payload items → Create new items
6. **Delete**: Remaining unmatched DB items → Mark for deletion
```

#### Decision Comparison

| Aspect | Content-Based | ID-Based |
|--------|---------------|-----------|
| **Frontend Complexity** | ✅ Simple (reuse create form) | ❌ Complex (ID tracking, state management) |
| **Backend Complexity** | ❌ Complex matching algorithm | ✅ Simple explicit operations |
| **Development Time** | ✅ ~2 days (code reuse) | ❌ ~1 week (form rebuild) |
| **Precision** | ❌ 95% cases perfect, edge cases acceptable | ✅ 100% perfect precision |
| **Code Maintenance** | ✅ Less code, fewer bugs | ❌ More complex state management |

#### Edge Cases and Limitations

**Acceptable Limitations:**
- **Title Swapping**: If user swaps titles between two items, algorithm treats as separate updates (items keep original positions). Rare scenario with acceptable outcome.
- **Complex Reordering**: Moving identical items may not preserve exact intent, but final state is achieved.

**Prevented Issues:**
- **Duplicate Titles**: Client and server validation prevents duplicate item titles, eliminating matching ambiguity.
- **Image Cleanup**: Old images are NOT deleted immediately (preserve ranking historical references). Background cleanup job handles orphaned images periodically.

#### Implementation Benefits

1. **Development Speed**: Reuse 90% of existing create form logic
2. **User Experience**: Form feels natural - users edit content directly without seeing technical IDs
3. **Maintainability**: Simpler codebase with fewer edge cases to handle
4. **Risk Mitigation**: Can refactor to ID-based approach later if limitations become problematic

#### Validation Strategy

**Prevent Duplicate Titles:**
```typescript
// Client and server validation
const items = formData.items;
const titles = items.map(item => item.title.trim().toLowerCase());
const hasDuplicates = titles.length !== new Set(titles).size;

if (hasDuplicates) {
  throw new Error("Item titles must be unique");
}
```

#### Image Handling Strategy

**No Immediate Deletion:**
- Upload new images for updated items
- Update database URLs to point to new images  
- Keep old images in R2 (referenced by ranking snapshots)
- Implement background cleanup job for truly orphaned images

**Per-Item Upload During DB Operations:**
```typescript
// Following existing create sorter pattern:
for (const item of processedItems) {
  if (item.needsNewImage) {
    // 1. Upload image to R2
    const imageUrl = await uploadToR2(imageKey, buffer);
    // 2. Update/create item with final URL
    await updateOrCreateItem(item.id, { ...item, imageUrl });
  }
}
```

#### Phase 3: Advanced Features

1. **Edit indicators** showing when items/sorters have been modified since ranking
2. **Version comparison** between snapshot and current state
3. **Bulk editing** and import/export functionality

### Technical Considerations

#### Storage Impact

- **Item snapshots**: Already implemented, ~100-300 bytes per ranked item
- **Sorter snapshots**: Additional ~50-200 bytes per ranking (title + cover URL)
- **Total increase**: Minimal, as item data is already stored
- **Mitigation**: Clean up old images periodically, monitor growth
- **Benefits**: Guaranteed data integrity, no broken rankings, complete historical accuracy

#### Performance Impact

- **Read performance**: Improved (rankings fully self-contained, no joins to sorters table)
- **Write performance**: Minimal impact (additional fields captured during save)
- **Query complexity**: Reduced (rankings display requires no external lookups)

#### User Experience

- **Rankings never break** regardless of sorter changes (title, cover, items)
- **Perfect historical accuracy** preserved - rankings show exactly what users saw when sorting
- **Consistent display** across time - rankings remain unchanged when sorters are edited
- **Future enhancement**: Optional indicators showing when items/sorters have been modified since ranking

### Alternative Considerations

#### Image Storage Strategy

- Store image URLs as-is (simpler, but images may disappear)

#### Cleanup Strategy

- **Orphaned images**: Implement cleanup job for unused images
- **Storage monitoring**: Track growth and optimize as needed

### Migration Plan

#### Step 1: Database Schema Update

```sql
-- Add sorter-level snapshot columns
ALTER TABLE sorting_results
ADD COLUMN sorter_title TEXT,
ADD COLUMN sorter_cover_image_url TEXT;
```

#### Step 2: Data Migration

```sql
-- Populate existing rankings with current sorter data
UPDATE sorting_results
SET
  sorter_title = s.title,
  sorter_cover_image_url = s.cover_image_url
FROM sorters s
WHERE sorting_results.sorter_id = s.id;
```

#### Step 3: Update Application Code

1. **Ranking Save API**: Capture sorter title and cover image during save
2. **Rankings Display**: Use snapshot data with fallback to live data
3. **Backward Compatibility**: Handle null snapshot fields gracefully

#### Step 4: Testing & Deployment

1. Test migration with development data
2. Verify rankings display correctly with snapshot data
3. Test fallback behavior for existing rankings
4. Deploy with monitoring and rollback plan (migration scripts should include rollback procedures for future maintainability)

## Implementation Priority

### Phase 1: Complete Immutable Snapshots (PREREQUISITE)

1. **CRITICAL**: Add sorter-level snapshot fields (`sorter_title`, `sorter_cover_image_url`)
2. **CRITICAL**: Update ranking save API to capture sorter snapshots
3. **HIGH**: Update rankings display to use snapshot data
4. **HIGH**: Migrate existing rankings with current sorter data

### Phase 2: Sorter Editing (AFTER PHASE 1)

1. **MEDIUM**: Create sorter edit UI and API endpoints
2. **MEDIUM**: Implement item management functionality
3. **LOW**: Advanced editing features and analytics

**Note**: Phase 1 must be completed before implementing sorter editing to ensure no rankings break when sorters are modified.

## Success Metrics

- **Zero broken rankings** after sorter edits
- **Performance maintained** or improved (baseline metrics should be established before implementation)
- **User satisfaction** with ranking persistence
- **Storage growth** within acceptable limits

---

## Current Status Update

**✅ PARTIALLY IMPLEMENTED**

- Item-level snapshots are already working correctly
- `sortingResults.rankings` JSON stores complete item data (`id`, `title`, `imageUrl`)
- Item images and names maintain historical accuracy in rankings

**❌ MISSING COMPONENTS**

- Sorter-level snapshots (title and cover image)
- Rankings currently fetch live sorter data, breaking historical accuracy when sorters are edited

**🎯 NEXT STEPS**

1. Implement Phase 1 (sorter-level snapshots) as prerequisite
2. Once complete, sorter editing can be safely implemented without breaking existing rankings

_Plan created: 2024-01-25_  
_Updated: 2025-01-25 - Added current implementation status and sorter-level snapshot requirements_  
_Status: Ready for Phase 1 implementation_
