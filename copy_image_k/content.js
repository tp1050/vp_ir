// Function to paste image into Google Photos (runs in content script)
async function pasteImageToGooglePhotos() {
  try {
    console.log('🎯 Starting paste into Google Photos...');
    
    // Get image from clipboard
    const clipboardItems = await navigator.clipboard.read();
    console.log('📋 Clipboard items found:', clipboardItems.length);
    
    if (clipboardItems.length === 0) {
      console.log('❌ No items in clipboard');
      return;
    }
    
    // Find image in clipboard
    let imageBlob = null;
    let imageType = null;
    
    for (const clipboardItem of clipboardItems) {
      console.log('🔍 Checking item types:', clipboardItem.types);
      
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          console.log('🖼️ Found image type:', type);
          imageBlob = await clipboardItem.getType(type);
          imageType = type;
          break;
        }
      }
      if (imageBlob) break;
    }
    
    if (!imageBlob) {
      console.log('❌ No image found in clipboard');
      return;
    }
    
    console.log('✅ Image found:', imageType, imageBlob.size, 'bytes');
    
    // Create file from blob
    const extension = imageType.split('/')[1];
    const file = new File([imageBlob], `pasted-image.${extension}`, {
      type: imageType
    });
    
    console.log('📁 File created:', file.name);
    
    // 🎯 GOOGLE PHOTOS SPECIFIC TARGETING
    
    // Method 1: Look for the upload button in top right
    const uploadButton = document.querySelector('[aria-label*="upload" i]') || 
                        document.querySelector('[title*="upload" i]') ||
                        document.querySelector('button:contains("Upload")') ||
                        document.querySelector('[data-test-id*="upload" i]');
    
    if (uploadButton) {
      console.log('🎯 Found upload button:', uploadButton);
      uploadButton.click();
      
      // Wait for file picker dialog, then try to set file
      setTimeout(() => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        console.log('📁 File inputs found after upload click:', fileInputs.length);
        
        if (fileInputs.length > 0) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputs[0].files = dataTransfer.files;
          
          const event = new Event('change', { bubbles: true });
          fileInputs[0].dispatchEvent(event);
          console.log('✅ File set on input element');
        }
      }, 1000);
      
      return;
    }
    
    // Method 2: Look for drag/drop area (whole page or specific zones)
    console.log('🎯 Trying drag and drop method...');
    
    // Try to find drop zones
    const dropZones = document.querySelectorAll('[data-drop-zone], .drop-zone, [ondrop]');
    console.log('📍 Drop zones found:', dropZones.length);
    
    // If no specific drop zones, use the whole document body
    const targetElements = dropZones.length > 0 ? dropZones : [document.body];
    
    for (const targetElement of targetElements) {
      try {
        console.log('🎯 Attempting drag/drop on:', targetElement);
        
        // Create drag events with the file
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        
        dropEvent.dataTransfer.items.add(file);
        
        // Dispatch events
        targetElement.dispatchEvent(dragOverEvent);
        targetElement.dispatchEvent(dropEvent);
        
        console.log('✅ Drag/drop events dispatched');
        
        // If we targeted a specific drop zone, we're done
        if (dropZones.length > 0) {
          break;
        }
        
      } catch (dropError) {
        console.log('❌ Drag/drop failed on element:', dropError);
      }
    }
    
    // Method 3: Try to trigger paste event anywhere on the page
    console.log('🎯 Trying paste event...');
    try {
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      
      pasteEvent.clipboardData.items.add(file);
      document.body.dispatchEvent(pasteEvent);
      console.log('✅ Paste event dispatched');
    } catch (pasteError) {
      console.log('❌ Paste event failed:', pasteError);
    }
    
    console.log('🎉 All upload methods attempted!');
    
    // Show success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    notification.textContent = 'Image upload attempted! Check if it appeared in Google Photos.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
  } catch (error) {
    console.error('❌ Failed to paste image:', error);
    
    // Show error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    notification.textContent = 'Failed to auto-upload. Try manual paste (Ctrl+V) or drag & drop.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
};