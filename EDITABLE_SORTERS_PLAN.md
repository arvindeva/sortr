# Editable Sorters Implementation Plan

## Problem Statement
When sorter creators edit their sorters (rename items, delete items, add items), existing rankings reference the old data structure, potentially causing:
- **Broken references**: Rankings pointing to deleted items
- **Missing images**: Deleted images still referenced in rankings
- **Inconsistent display**: Old item names vs. new item names
- **Data corruption**: Rankings becoming meaningless

## Solution Approaches Analyzed

### Option 1: Immutable Snapshots (RECOMMENDED)
- **Rankings store complete item data** at the time of sorting
- Rankings become self-contained with names, images, descriptions
- **Pros**: Perfect data integrity, rankings never break
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
Store complete item data in `sortingResults` table at the time ranking is created. Rankings become permanent historical records that never break.

### Database Schema Changes

#### Current `sortingResults.rankings` JSON:
```json
{
  "rankings": [
    {
      "id": "item-123",
      "rank": 1
    }
  ]
}
```

#### New `sortingResults.rankings` JSON:
```json
{
  "rankings": [
    {
      "id": "item-123",
      "rank": 1,
      "title": "Item Name at Time of Ranking",
      "imageUrl": "https://example.com/image.jpg",
      "originalItemId": "item-123",
      "snapshotDate": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Implementation Steps

#### Phase 1: Schema Migration
1. **Backup existing data**
2. **Add new fields** to `sortingResults.rankings` JSON structure
3. **Migrate existing rankings** to include current item data
4. **Maintain backward compatibility** during transition

#### Phase 2: Update Ranking Creation
1. **Modify ranking save logic** to snapshot item data
2. **Include all essential fields**: title, imageUrl, groupId, etc.
3. **Store sorter metadata** at time of ranking for context

#### Phase 3: Update Ranking Display
1. **Use snapshot data** for displaying rankings
2. **Add indicators** for items that no longer exist in current sorter
3. **Optional: Show diff** between snapshot and current state

#### Phase 4: Implement Sorter Editing
1. **Create sorter edit UI** and API endpoints
2. **Allow item modifications** without affecting existing rankings
3. **Handle image updates** and cleanup

### Technical Considerations

#### Storage Impact
- **Estimated increase**: ~200-500 bytes per ranked item
- **Mitigation**: Compress JSON, clean up old images periodically
- **Benefits**: Guaranteed data integrity, no broken rankings

#### Performance Impact
- **Read performance**: Improved (no joins needed for display)
- **Write performance**: Minimal impact (snapshot during save)
- **Query complexity**: Reduced (self-contained data)

#### User Experience
- **Rankings never break** regardless of sorter changes
- **Historical accuracy** preserved
- **Clear indicators** when items are modified/deleted
- **Consistent display** across time

### Alternative Considerations

#### Image Storage Strategy
- **Option A**: Store image URLs as-is (simpler, but images may disappear)
- **Option B**: Copy images to permanent storage (more complex, guaranteed availability)
- **Recommendation**: Start with Option A, upgrade to Option B if needed

#### Cleanup Strategy
- **Orphaned images**: Implement cleanup job for unused images
- **Old rankings**: Consider archiving very old rankings
- **Storage monitoring**: Track growth and optimize as needed

### Migration Plan

#### Step 1: Prepare Migration Script
```sql
-- Add snapshot data to existing rankings
UPDATE sorting_results 
SET rankings = (
  -- JSON transformation to add item details
  -- Implementation depends on your database JSON functions
);
```

#### Step 2: Update Application Code
1. Modify `saveSortingResult` to include item snapshots
2. Update ranking display to use snapshot data
3. Add fallback logic for missing data

#### Step 3: Test Migration
1. Test with subset of data
2. Verify ranking display integrity
3. Performance test with large datasets

#### Step 4: Deploy
1. Deploy during low-traffic period
2. Monitor for issues
3. Rollback plan ready

### Future Enhancements

#### Version History
- Store edit history for sorters
- Allow users to see "ranking was created with version X"
- Provide diff view between versions

#### Smart Updates
- Detect minor changes (typo fixes) vs major changes (item deletion)
- Option to update rankings for minor changes
- Always preserve for major changes

#### Analytics
- Track which items are most commonly deleted
- Monitor ranking integrity over time
- User behavior around edited sorters

## Implementation Priority
1. **High**: Schema design and migration planning
2. **High**: Ranking creation snapshot logic
3. **Medium**: Display updates and indicators
4. **Medium**: Sorter editing interface
5. **Low**: Advanced features and analytics

## Success Metrics
- **Zero broken rankings** after sorter edits
- **Performance maintained** or improved
- **User satisfaction** with ranking persistence
- **Storage growth** within acceptable limits

---

*Plan created: 2024-01-25*  
*Status: Design phase - ready for implementation*