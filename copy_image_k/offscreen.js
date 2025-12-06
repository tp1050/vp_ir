// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen' && message.type === 'copy-image') {
    copyImageToClipboard(message.imageUrl);
  }
});

// Function to copy image to clipboard with multiple fallback methods
async function copyImageToClipboard(imageUrl) {
  try {
    // Method 1: Try direct fetch and clipboard API
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    if (blob.type.startsWith('image/')) {
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });
      await navigator.clipboard.write([clipboardItem]);
      console.log('Image copied successfully using direct method!');
      return;
    }
  } catch (error) {
    console.log('Direct method failed, trying canvas method:', error);
  }

  try {
    // Method 2: Canvas method for cross-origin images
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob
        canvas.toBlob(async function(blob) {
          if (blob) {
            const clipboardItem = new ClipboardItem({
              [blob.type]: blob
            });
            await navigator.clipboard.write([clipboardItem]);
            console.log('Image copied successfully using canvas method!');
          }
        }, 'image/png');
      } catch (canvasError) {
        console.log('Canvas method failed, trying proxy method:', canvasError);
        tryCanvasWithProxy(imageUrl);
      }
    };
    
    img.onerror = function() {
      console.log('Image load failed, trying proxy method');
      tryCanvasWithProxy(imageUrl);
    };
    
    // Add timestamp to bypass cache
    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    
  } catch (error) {
    console.error('All methods failed:', error);
  }
}

// Method 3: Try canvas with proxy to avoid CORS
async function tryCanvasWithProxy(imageUrl) {
  try {
    // Use a CORS proxy service (you can also set up your own)
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async function(blob) {
        if (blob) {
          const clipboardItem = new ClipboardItem({
            [blob.type]: blob
          });
          await navigator.clipboard.write([clipboardItem]);
          console.log('Image copied successfully using proxy method!');
        }
      }, 'image/png');
    };
    
    img.src = proxyUrl;
    
  } catch (proxyError) {
    console.error('Proxy method also failed:', proxyError);
    
    // Final fallback: Try to at least copy the image URL as text
    try {
      await navigator.clipboard.writeText(imageUrl);
      console.log('Could not copy image, but copied URL instead');
    } catch (urlError) {
      console.error('All copy methods failed completely');
    }
  }
}