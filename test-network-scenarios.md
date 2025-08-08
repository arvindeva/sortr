# Network Scenarios Testing Guide

## Browser DevTools Testing

### Test Network Interruption
1. Go to create/edit sorter page
2. Start uploading multiple large images (5+ files, 2-3MB each)
3. **During upload**: Open DevTools → Network tab → Set to "Offline"
4. **Expected**: Should see "Network connection lost - upload paused..." message
5. **Re-enable**: Set back to "Online" 
6. **Expected**: Should see "Network connectivity restored" and upload continues

### Test Slow Network
1. DevTools → Network tab → Set to "Slow 3G"
2. Upload multiple images
3. **Expected**: Progress bars should update smoothly, no stuck uploads
4. **Expected**: Should complete successfully despite slow connection

### Test Network Timeout
1. DevTools → Network tab → Add request blocking for "upload-tokens"
2. Try to create sorter with images
3. **Expected**: Should show timeout error after 30 seconds with clear message

## 2. **Upload Timeout Testing**

### Test Large File Upload
```bash
# Create a large test image (close to 5MB limit)
convert -size 2000x2000 xc:red test-large-image.jpg
```
1. Upload this large file
2. **Expected**: Should complete within 5 minutes or show timeout message

### Test Stuck Upload Simulation
1. Upload files normally
2. **During upload**: Pause network in DevTools for 35+ seconds
3. **Expected**: Should detect stuck upload and show warning (progress watchdog)

## 3. **Retry Logic Testing**

### Test Server Error Simulation
1. Use browser DevTools → Network tab
2. Right-click on any upload request → "Block request URL"
3. Try uploading images
4. **Expected**: Should retry 3 times with exponential backoff
5. **Expected**: Should show retry messages in console

### Test Connection Issues
1. Rapidly toggle network on/off during upload
2. **Expected**: Should handle interruptions gracefully with retries

## 4. **Error Message Testing**

### Test File Size Limits
1. Try uploading file > 5MB for items or > 10MB for cover
2. **Expected**: Clear error message about file size limits

### Test Invalid File Types
1. Try uploading .txt or .pdf file
2. **Expected**: Clear error about supported formats

### Test Authentication Issues
1. Log out during upload (open new incognito tab, log out there)
2. **Expected**: Should show authentication error

## 5. **Production-Like Testing**

### Test Multiple Concurrent Users
```bash
# Open multiple browser tabs/windows
# Have each upload different sorters simultaneously
# Expected: No conflicts, all uploads should succeed
```

### Test Browser Resource Limits
1. Upload 50+ images at once
2. **Expected**: Should handle gracefully with batching
3. **Expected**: Progress updates should remain responsive

## 6. **Console Monitoring**

During all tests, monitor browser console for:
- ✅ Retry attempt logs with timing
- ✅ Network status change logs
- ✅ Progress watchdog warnings for stuck uploads
- ✅ Timeout error messages with clear descriptions
- ❌ No unhandled errors or crashes

## 7. **Mobile Testing**

### Test Mobile Network Conditions
1. Use Chrome DevTools mobile simulation
2. Test with poor network conditions
3. Test network switching (WiFi → Mobile data)
4. **Expected**: Uploads should handle network changes gracefully

## 8. **Memory Usage Testing**

### Test Large Batch Uploads
1. Upload 20+ large images
2. Monitor browser memory usage in Task Manager
3. **Expected**: No memory leaks, reasonable memory usage
4. **Expected**: Cleanup after completion/cancellation

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Test with network simulation
# 1. Go to http://localhost:3000/create
# 2. Add 5-10 test images (2-3MB each)
# 3. Follow network testing scenarios above
```

## Expected Improvements Over Previous Version

- 🔄 **Retries**: Failed uploads now retry up to 3 times
- ⏱️ **Timeouts**: Clear timeout messages instead of hanging
- 🌐 **Network Awareness**: Detects offline/online status
- 📊 **Progress Monitoring**: Detects and reports stuck uploads
- 🎯 **Better Errors**: Specific error messages for different failure types
- 🔧 **Exponential Backoff**: Smart retry timing to avoid server overload