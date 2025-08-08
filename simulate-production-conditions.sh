#!/bin/bash

# Simulate production conditions for upload testing
echo "🌐 Simulating production upload conditions..."

# Create test images of various sizes
echo "📸 Creating test images..."
mkdir -p test-images

# Create different sized test images using ImageMagick (if available)
if command -v convert >/dev/null 2>&1; then
    # Small image (should upload quickly)
    convert -size 800x600 xc:blue test-images/small-test.jpg
    
    # Medium images (realistic user uploads)
    convert -size 1920x1080 xc:red test-images/medium-test-1.jpg
    convert -size 1920x1080 xc:green test-images/medium-test-2.jpg
    convert -size 1920x1080 xc:yellow test-images/medium-test-3.jpg
    
    # Large image (near limit, should trigger timeout handling)
    convert -size 3000x2000 xc:purple test-images/large-test.jpg
    
    echo "✅ Created test images in ./test-images/"
else
    echo "⚠️ ImageMagick not found. Please create test images manually."
    echo "   Suggested sizes: 800x600, 1920x1080, 3000x2000"
fi

echo ""
echo "🧪 Test Scenarios:"
echo "1. Upload small image - should complete quickly"
echo "2. Upload 3-4 medium images - test batching and progress"
echo "3. Upload large image - test timeout handling"
echo "4. During upload, toggle network in DevTools"
echo "5. Block requests in DevTools to test retries"
echo ""
echo "📊 Monitor browser console for:"
echo "   - Retry attempts with exponential backoff"
echo "   - Network status changes"
echo "   - Progress watchdog warnings"
echo "   - Timeout error messages"
echo ""
echo "🔗 Go to: http://localhost:3001/create"