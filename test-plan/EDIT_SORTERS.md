# EDIT SORTERS - Comprehensive Testing Checklist

This document provides a thorough testing checklist to validate all aspects of the edit sorter functionality.

## 🔧 **Basic Edit Operations**

### **1. Metadata-Only Changes**

- [ ] **Title only**: Change title, keep everything else → Should work with 0 uploads
- [ ] **Description only**: Update description → Should work instantly
- [ ] **Category only**: Change category → Should work instantly
- [ ] **All metadata**: Change title + description + category → Should work instantly

### **2. Tag Management**

- [ ] **Add new tags**: Add 2-3 new tags → Should appear in tag selection for all items
- [ ] **Remove existing tags**: Delete a tag → Should disappear from all items
- [ ] **Reorder tags**: Drag-and-drop reorder → Should maintain order
- [ ] **Rename tags**: Edit existing tag name → Should update everywhere

## 📸 **Image Operations**

### **3. Cover Image Handling**

- [ ] **Replace cover**: Upload new cover image → Should show new preview immediately
- [ ] **Remove cover**: Remove existing cover → Should clear preview
- [ ] **Keep cover**: Don't touch cover image → Should preserve original

**🐛 KNOWN BUG**: Cover image upload has issues:

- Cover image doesn't display after successful edit
- Second upload attempt shows error: "Expected 2 upload URLs for [filename], but got 1"
- Suggests mismatch between upload system expectations and reality

### **4. Item Image Management**

- [ ] **Single replace**: Click pencil icon, replace one item image → Should show new preview
- [ ] **Multiple replace**: Replace 3-4 different item images → All should show correct previews
- [ ] **Remove image**: Delete image from item → Should show no preview
- [ ] **Mixed operations**: Replace some, remove some, keep some → Should handle correctly

### **5. Upload Images Button**

- [ ] **Multiple upload**: Select 5 images via "Upload Images" → All should show previews
- [ ] **Empty slots**: Upload to form with empty items → Should fill empty slots first
- [ ] **New items**: Upload more images than empty slots → Should create new items
- [ ] **Filename naming**: Check if filenames become item names → Should auto-populate

## 📝 **Item Management**

### **6. Add/Remove Items**

- [ ] **Add manual item**: Click "Add Item" → Should add empty row
- [ ] **Remove existing item**: Click X on item with image → Image should disappear
- [ ] **Remove then add**: Remove item, then add new → No image mismatch
- [ ] **Reorder items**: Test if drag-drop works (if implemented) → Should maintain images

### **7. Tag Assignment**

- [ ] **Assign tags**: Click tag buttons under items → Should toggle correctly
- [ ] **Multiple tags**: Assign multiple tags to one item → Should show all selected
- [ ] **Change assignments**: Remove tag from item, add different tag → Should update correctly

## 🔄 **Complex Scenarios**

### **8. Mixed Edit Operations**

- [ ] **Everything at once**: Change title + add tags + replace images + add items → Should work
- [ ] **Large edit**: Edit sorter with 20+ items → Should handle performance well
- [ ] **Cancel edit**: Start editing, then navigate away → Should not save changes

### **9. Edge Cases**

- [ ] **Empty form**: Try to submit with 0 items → Should show validation error
- [ ] **One item**: Try to submit with only 1 item → Should show validation error
- [ ] **No changes**: Edit form but change nothing → Should still work (version increment)
- [ ] **Invalid images**: Try uploading non-image files → Should show error

## 🔒 **Permissions & Security**

### **10. Access Control**

- [ ] **Owner access**: Edit your own sorter → Should show Edit button and work
- [ ] **Non-owner**: Try to access edit URL for someone else's sorter → Should redirect
- [ ] **Not logged in**: Try to access edit URL without login → Should redirect to signin

### **11. URL Security**

- [ ] **Direct URL**: Navigate directly to `/sorter/[slug]/edit` → Should verify ownership
- [ ] **Invalid slug**: Try editing non-existent sorter → Should show 404
- [ ] **Deleted sorter**: Try editing deleted sorter → Should show 404

## 📊 **Data Integrity**

### **12. Version History**

- [ ] **Rankings preserved**: Edit sorter that has rankings → Old rankings should still work
- [ ] **Version increment**: Check that version increases after edit → Should be currentVersion + 1
- [ ] **History archival**: Verify old version is saved → Should exist in sorterHistory table

### **13. Image Versioning**

- [ ] **Image copying**: Edit without changing images → Should copy images to new version path
- [ ] **New image paths**: Upload new images → Should save to new version path
- [ ] **Mixed scenarios**: Some kept, some new images → Should handle both correctly

## 🎯 **User Experience**

### **14. Form Behavior**

- [ ] **Pre-population**: Form should load with current data → All fields filled correctly
- [ ] **Image previews**: Existing images should show → Should see all current images
- [ ] **Tag selection**: Current tag assignments should show → Tags should be selected
- [ ] **Validation**: Form validation should work → Show errors for invalid data

### **15. Navigation & Feedback**

- [ ] **Back button**: Click back arrow → Should return to sorter page
- [ ] **Cancel button**: Click cancel → Should return without saving
- [ ] **Success redirect**: Successful edit → Should redirect to updated sorter page
- [ ] **Error handling**: Network/server errors → Should show helpful error messages

## 🚀 **Performance & Polish**

### **16. Loading States**

- [ ] **Upload progress**: Upload multiple large images → Should show progress dialog
- [ ] **Form submission**: Click "Update Sorter" → Should show loading state
- [ ] **Image previews**: Large images → Should load and display properly

### **17. Mobile Responsiveness**

- [ ] **Mobile layout**: Test on mobile device → Should be usable
- [ ] **Touch interactions**: Tap buttons, upload images → Should work correctly
- [ ] **Small screens**: All functionality accessible → No hidden elements

## 🔍 **Final Validation**

### **18. End-to-End Flows**

- [ ] **Complete edit cycle**: Edit → Save → View updated sorter → Should see all changes
- [ ] **Sorting still works**: Edit sorter → Try sorting → Should work with new data
- [ ] **Sharing still works**: Edit sorter → Share ranking → Should work correctly

### **19. Cross-Browser Testing**

- [ ] **Chrome**: All functionality works
- [ ] **Firefox**: All functionality works
- [ ] **Safari**: All functionality works
- [ ] **Edge**: All functionality works

## 🐛 **Known Issues**

### **Cover Image Upload Bug**

**Status**: 🔴 Critical

**Description**:

- Cover image upload appears to succeed but doesn't display after edit
- Subsequent attempts to upload cover image fail with error: `Expected 2 upload URLs for [filename], but got 1`

**Reproduction Steps**:

1. Edit a sorter (with or without existing cover image)
2. Upload new cover image
3. Submit edit → Cover image doesn't show
4. Edit again and try to upload cover image → Error appears

**Analysis**:

- Error suggests upload system expects multiple URLs (thumbnail + full size) for cover images
- Mismatch between what upload token request asks for vs what it receives
- Cover image handling may differ between create and edit flows

**Investigation Results**:

- ✅ **Root Cause Found**: Upload system determines file type by filename prefix
  - Item files: Expected to have 2 URLs (thumbnail + full size)
  - Cover files: Expected to have 1 URL (full size only)
  - Detection logic: `!filename.toLowerCase().startsWith("cover-")`
- ❌ **Problem**: Edit form doesn't prefix cover image filenames with "cover-"
  - Upload system treats cover images as item files → requests 2 URLs
  - Upload token API likely only provides 1 URL for cover → mismatch error

**Fix Required**:

- [ ] Edit form needs to prefix cover image filenames with "cover-" before upload
- [ ] Or modify file type detection logic to handle edit form file organization
- [ ] Test both cover image upload and URL generation after fix

## 🎉 **Success Criteria**

**The edit feature is ready when:**

- ✅ All basic operations work smoothly
- ✅ Image handling is intuitive and reliable
- ✅ No data corruption or version history issues
- ✅ Performance is acceptable for normal use cases
- ✅ Error handling provides helpful feedback
- ✅ Mobile experience is fully functional
- ✅ **Cover image bug is resolved**

## 📋 **Testing Notes**

**High Priority Test Cases** (test these first):

1. Basic metadata changes (title, description)
2. Single item image replacement
3. Multiple image upload via "Upload Images" button
4. Item removal with image mismatch check
5. Cover image upload (currently buggy)

**Test Environment Setup**:

- Use development environment with test sorters
- Test with various image formats (JPG, PNG, WebP)
- Test with different image sizes
- Test on both desktop and mobile

**Bug Reporting**:

- Include browser, device, and steps to reproduce
- Screenshot any error messages
- Note if issue is consistent or intermittent
