# Image Upload Progress Implementation Plan

## Overview

Implement upload progress tracking for the create sorter form using axios and Dialog components to provide better UX during image uploads while preventing accidental user interaction.

## Current State

- Create sorter form uses fetch() for all submissions
- Only loading state is button text change ("Creating...")
- No progress indication for potentially slow image uploads
- Users can navigate away during upload without warning

## Proposed Solution

### Two-Dialog Approach

1. **Confirmation Dialog** - Review before submission
2. **Upload Progress Dialog** - Non-closable progress tracking

### Smart Upload Detection

- **Text-only sorters**: Keep existing fast JSON fetch with simple loading state
- **With images**: Use axios with progress dialog for multipart uploads

## Implementation Steps

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Update Dialog Component

Modify `/src/components/ui/dialog.tsx` to add `preventClose` prop:

```tsx
function DialogContent({
  className,
  children,
  preventClose = false, // NEW PROP
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  preventClose?: boolean; // NEW PROP TYPE
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
        onPointerDownOutside={preventClose ? (e) => e.preventDefault() : undefined}
        onInteractOutside={preventClose ? (e) => e.preventDefault() : undefined}
        // ... existing props
      >
        {children}
        {/* Conditionally render close button */}
        {!preventClose && (
          <DialogPrimitive.Close className="...">
            <X />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
```

### 3. Update Create Sorter Form State

Add new state variables to `/src/app/create/create-sorter-form.tsx`:

```tsx
const [showConfirmDialog, setShowConfirmDialog] = useState(false)
const [showProgressDialog, setShowProgressDialog] = useState(false)
const [uploadProgress, setUploadProgress] = useState(0)
const [uploadStatus, setUploadStatus] = useState('')
const [isUploading, setIsUploading] = useState(false)
```

### 4. Update Form Submission Flow

**Current flow:**
```
Form Submit → Loading State → API Call → Redirect
```

**New flow:**
```
Form Submit → Check for Images
├─ Text only: Fast JSON fetch (existing behavior)
└─ With images: Confirmation Dialog → Progress Dialog → Axios Upload → Redirect
```

### 5. Implementation Details

#### Confirmation Dialog
- Show sorter summary (title, description, item/image counts)
- "Create Sorter" and "Review Form" buttons
- Can be closed normally (preventClose={false})
- Always shown for image uploads, optional for text-only

#### Upload Progress Dialog
- Real-time progress bar (0-100%)
- Status messages: "Uploading images..." → "Processing..." → "Creating sorter..."
- Image counter: "Uploading 3 of 5 images..."
- Cannot be closed (preventClose={true})
- No close button, no escape key, no outside click

#### Axios Upload Implementation
```tsx
const uploadWithProgress = async (formData: FormData) => {
  setShowProgressDialog(true)
  setIsUploading(true)
  
  try {
    const response = await axios.post('/api/sorters', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        setUploadProgress(percent)
        setUploadStatus(`Uploading ${percent}% complete...`)
      }
    })
    
    setUploadStatus('Processing...')
    // Handle response and redirect
  } catch (error) {
    // Show error in dialog with retry option
  } finally {
    setIsUploading(false)
    setShowProgressDialog(false)
  }
}
```

### 6. Navigation Protection

Add beforeunload warning during uploads:

```tsx
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isUploading) {
      e.preventDefault()
      e.returnValue = 'Upload in progress. Are you sure you want to leave?'
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [isUploading])
```

### 7. AbortController for Cleanup

```tsx
const abortControllerRef = useRef<AbortController | null>(null)

// In upload function
abortControllerRef.current = new AbortController()

const response = await axios.post('/api/sorters', formData, {
  signal: abortControllerRef.current.signal,
  // ... other options
})

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }
}, [])
```

## User Experience Flow

### Text-Only Sorter (No Changes)
1. User fills form without images
2. Clicks "Create Sorter"
3. Button shows "Creating..." (existing behavior)
4. Fast JSON API call
5. Redirect to sorter page

### Sorter with Images (New Flow)
1. User fills form with images
2. Clicks "Create Sorter"
3. **Confirmation Dialog** appears:
   - "Create sorter 'Marvel Movies' with 15 items and 12 images?"
   - "Create Sorter" / "Review Form" buttons
4. User clicks "Create Sorter"
5. **Upload Progress Dialog** appears:
   - Progress bar (0-100%)
   - "Uploading 3 of 5 images..." 
   - Cannot be closed
6. Upload completes
7. Dialog closes, redirect to sorter page

## Error Handling

- Network errors: Show in progress dialog with "Retry" button
- Validation errors: Close progress dialog, show in form
- Aborted uploads: Clean up state, return to form
- File size errors: Validate before showing confirmation dialog

## Benefits

- **Clear progress indication** during potentially slow uploads
- **Prevents accidental navigation** during upload
- **Professional UX** with full-screen dialog focus
- **No performance impact** on text-only sorters
- **Mobile-friendly** progress display
- **Error recovery** with retry options
- **Clean separation** between upload and processing phases

## Files to Modify

1. `/src/components/ui/dialog.tsx` - Add preventClose prop
2. `/src/app/create/create-sorter-form.tsx` - Main implementation
3. `package.json` - Add axios dependency

## Testing Checklist

- [ ] Text-only sorters work unchanged
- [ ] Image uploads show confirmation dialog
- [ ] Progress bar updates in real-time
- [ ] Dialog cannot be closed during upload
- [ ] Navigation warnings work
- [ ] Error handling and retry functionality
- [ ] Mobile responsive dialogs
- [ ] Upload cancellation cleanup

---

_Plan created: 2025-01-26_  
_Status: Ready for Implementation_