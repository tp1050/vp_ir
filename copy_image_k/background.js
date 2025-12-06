// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyImageToClipboard",
    title: "Copy image to clipboard",
    contexts: ["image"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyImageToClipboard") {
    // Inject content script to handle the clipboard operation
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyImageToClipboard,
      args: [info.srcUrl]
    }).then((injectionResults) => {
      if (injectionResults && injectionResults[0] && injectionResults[0].result) {
        // injectionResults[0].result is the promise returned by async func
        return injectionResults[0].result;
      } else {
        throw new Error('Injection failed—no result returned');
      }
    }).then((copyResult) => {
      // Waited for copy promise to resolve (success)
      console.log('Copy complete—opening Google Photos tab');
      // Now navigate to Google Photos
      chrome.tabs.create({ url: 'https://photos.google.com/', active: true }, (newTab) => {
        // Wait for the new tab to fully load
        const loadListener = (updatedTabId, changeInfo) => {
          if (updatedTabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(loadListener);
            // Small delay for page render and focus (tune if needed)
            setTimeout(() => {
              chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                func: simulatePasteInPhotos
              });
            }, 2000); // 2s buffer for login/page load
          }
        };
        chrome.tabs.onUpdated.addListener(loadListener);
      });
    }).catch((error) => {
      console.error('Copy or injection failed:', error);
      // Still open tab, but alert for manual
      chrome.tabs.create({ url: 'https://photos.google.com/', active: true }, (newTab) => {
        // ... same load listener, but inject alert instead
        const loadListener = (updatedTabId, changeInfo) => {
          if (updatedTabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(loadListener);
            setTimeout(() => {
              chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                func: () => {
                  alert('Copy failed—right-click the image > Copy Image manually, then Ctrl+V here.');
                  document.body.focus();
                }
              });
            }, 2000);
          }
        };
        chrome.tabs.onUpdated.addListener(loadListener);
      });
    });
  }
});

// Unchanged copy function (but now returns promise for chaining)
async function copyImageToClipboard(imageUrl) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Fetch the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Check if it's a valid image
        if (!blob.type.startsWith('image/')) {
          console.error('Not a valid image');
          return reject(new Error('Not a valid image'));
        }
        
        // Convert blob to clipboard item
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob
        });
        
        // Write to clipboard
        await navigator.clipboard.write([clipboardItem]);
        
        // Show success notification (optional)
        console.log('Image copied to clipboard!');
        resolve({ success: true });
        
      } catch (error) {
        console.error('Failed to copy image:', error);
        
        // Fallback method for cross-origin images
        try {
          // Create a canvas to handle cross-origin images
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
                console.log('Image copied to clipboard using canvas fallback!');
                resolve({ success: true });
              } else {
                reject(new Error('Fallback toBlob failed'));
              }
            }, 'image/png');
          };
          
          img.onerror = () => reject(new Error('Fallback image load failed'));
          img.src = imageUrl;
          
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          reject(fallbackError);
        }
      }
    })();
  });
}

// New helper func for paste simulation (injected into Photos tab)
function simulatePasteInPhotos() {
  document.body.focus(); // Ensure focus for paste
  // Try execCommand first (works if page allows)
  if (document.execCommand('paste')) {
    console.log('Paste via execCommand succeeded in Google Photos');
  } else {
    // Fallback: Dispatch synthetic paste event (better for modern sites)
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer() // Empty, but triggers listener; relies on real clipboard
    });
    document.body.dispatchEvent(pasteEvent);
    console.log('Synthetic paste event dispatched in Google Photos');
  }
  // Optional: Alert if you want user nudge
  // alert('Paste triggered—check for upload dialog!');
}