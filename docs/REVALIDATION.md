# Cache Revalidation System

This document tracks the comprehensive cache revalidation system implemented across all API endpoints to ensure immediate UI updates when data changes.

## Overview

The application uses Next.js ISR (Incremental Static Regeneration) for performance, but requires strategic cache invalidation to show fresh data immediately after user actions. All POST/PUT/DELETE operations now include proper `revalidatePath()` calls.

## Revalidation Matrix

### User Profile Changes

#### Username Update (`PATCH /api/user`)
**Files:** `/src/app/api/user/route.ts`

**Revalidated Paths:**
- `/user/{oldUsername}` - Old profile URL (redirects)
- `/user/{newUsername}` - New profile URL  
- `/sorter/{slug}` - All user's sorter pages (show creatorUsername)
- `/` - Homepage (popular sorters show usernames)
- `/browse` - Browse page (all sorters show usernames)

**Why:** Username appears on sorter pages, homepage, and browse page. All references need immediate update.

#### Avatar Upload (`POST /api/upload-avatar`)
**Files:** `/src/app/api/upload-avatar/route.ts`

**Revalidated Paths:**
- `/user/{username}` - User profile page
- `/sorter/{slug}` - All user's sorter pages (may show user avatar)
- `/` - Homepage (may show avatars)
- `/browse` - Browse page (may show avatars)

**Why:** Avatar may appear anywhere user information is displayed.

#### Avatar Removal (`POST /api/remove-avatar`)
**Files:** `/src/app/api/remove-avatar/route.ts`

**Revalidated Paths:**
- `/user/{username}` - User profile page
- `/sorter/{slug}` - All user's sorter pages (may show user avatar)
- `/` - Homepage (may show avatars)
- `/browse` - Browse page (may show avatars)

**Why:** Same as avatar upload - all avatar references need update.

### Sorter Operations

#### Sorter Creation (`POST /api/sorters`)
**Files:** `/src/app/api/sorters/route.ts`

**Revalidated Paths:**
- `/sorter/{slug}` - New sorter page
- `/user/{username}` - Creator's profile page (shows their sorters)
- `/` - Homepage (new sorter may appear in popular list)
- `/browse` - Browse page (new sorter appears in listings)

**Why:** New sorter appears across multiple listing pages immediately.

#### Sorter Update (`PUT /api/sorters/[slug]`)
**Files:** `/src/app/api/sorters/[slug]/route.ts`

**Revalidated Paths:**
- `/sorter/{slug}` - The updated sorter page
- `/user/{username}` - Creator's profile page (may show updated info)
- `/` - Homepage (updated sorter info in popular list)
- `/browse` - Browse page (updated sorter info in listings)

**Why:** Sorter changes (title, description, cover image) need to appear everywhere it's listed.

#### Sorter Deletion (`DELETE /api/sorters/[slug]`)
**Files:** `/src/app/api/sorters/[slug]/route.ts`

**Revalidated Paths:**
- `/sorter/{slug}` - The sorter page (will show 404)
- `/user/{username}` - Creator's profile page (sorter removed from list)
- `/` - Homepage (removed from popular list)
- `/browse` - Browse page (removed from listings)

**Why:** Deleted sorters must disappear from all listing pages and show 404 on direct access.

### Engagement Operations

#### Ranking Completion (`POST /api/sorting-results`)
**Files:** `/src/app/api/sorting-results/route.ts`

**Revalidated Paths:**
- `/` - Homepage (completion count affects popularity ranking)
- `/browse` - Browse page (shows completion stats)

**Why:** Completion count changes affect sorter rankings and statistics shown on listing pages.

## Implementation Pattern

Each endpoint follows this pattern:

```typescript
// 1. Perform the database operation
await db.update(table).set(changes).where(condition);

// 2. Get related data for revalidation
const userData = await db.select({ username: user.username })...;
const userSorters = await db.select({ slug: sorters.slug })...;

// 3. Revalidate affected paths
revalidatePath('/'); // Global pages
revalidatePath('/browse');
if (userData.username) {
  revalidatePath(`/user/${userData.username}`); // User-specific pages
}
for (const sorter of userSorters) {
  revalidatePath(`/sorter/${sorter.slug}`); // Sorter-specific pages  
}

console.log(`♻️ Revalidated paths for {operation}: {identifier}`);
```

## Path Categories

### Global Pages (Always Revalidated)
- `/` - Homepage showing popular sorters
- `/browse` - Browse page showing all sorters

### User-Specific Pages
- `/user/{username}` - User profile pages
- Revalidated for: username changes, avatar changes, sorter operations

### Sorter-Specific Pages  
- `/sorter/{slug}` - Individual sorter pages
- Revalidated for: username changes, avatar changes, sorter operations

### Content-Dependent Pages
- Some pages only revalidated when their specific content changes
- Example: ranking completion only affects homepage/browse (not individual sorters)

## Performance Considerations

### Selective Revalidation
- Only revalidates paths that actually display the changed data
- User changes revalidate all their sorters (unavoidable - username shown on each)
- Ranking completion only revalidates listing pages (not individual sorters)

### Batch Revalidation
- Multiple `revalidatePath()` calls in single operation are efficient
- Next.js handles deduplication and batching internally

### Database Queries
- Additional queries needed to find related data for revalidation (user's sorters)
- Trade-off between query cost vs. cache accuracy (worth it for immediate updates)

## Testing Revalidation

### Manual Testing
1. **Username Change**: Update username → visit sorter page → should show new username
2. **Avatar Change**: Upload avatar → visit sorter page → should show new avatar  
3. **Sorter Update**: Edit sorter → visit homepage → should show updated info
4. **Sorter Creation**: Create sorter → visit browse page → should appear immediately
5. **Ranking Completion**: Complete a sort → visit homepage → completion count updated

### Monitoring
- Check server logs for revalidation messages: `♻️ Revalidated paths for {operation}`
- Verify no stale data appears after operations
- Test edge cases like rapid consecutive operations

## Troubleshooting

### Common Issues
1. **Still seeing old data**: Check if all related paths are being revalidated
2. **Performance issues**: Too many revalidations - optimize to only affected paths
3. **Missing revalidations**: New features may need revalidation added

### Debug Steps
1. Check server logs for revalidation messages
2. Verify `revalidatePath()` is called after database operations
3. Ensure correct paths are being revalidated (check exact URLs)
4. Test with browser network panel (disable cache) to verify fresh data

## Future Considerations

### Tag-Based Revalidation
Consider migrating to Next.js tag-based revalidation for more efficient invalidation:
```typescript
// Instead of path-based
revalidatePath('/browse');

// Use tag-based  
revalidateTag('sorter-listings');
```

### Webhook Integration
For external updates (admin actions, scheduled tasks), consider webhook-based revalidation.

### Performance Monitoring
Track revalidation frequency and performance impact as the application scales.

## Related Files

- `/src/app/api/user/route.ts` - Username changes
- `/src/app/api/upload-avatar/route.ts` - Avatar upload
- `/src/app/api/remove-avatar/route.ts` - Avatar removal
- `/src/app/api/sorters/route.ts` - Sorter creation
- `/src/app/api/sorters/[slug]/route.ts` - Sorter update/deletion
- `/src/app/api/sorting-results/route.ts` - Ranking completion

---

*Last updated: 2025-08-08*
*Status: ✅ Comprehensive revalidation implemented across all endpoints*