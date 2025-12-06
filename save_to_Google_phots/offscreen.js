// Listen for copy requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'COPY_IMAGE') {
    copyImageToClipboard(msg.src).catch((error) => {
      chrome.runtime.sendMessage({ type: 'COPY_ERROR', error: error.message });
    });
  }
});

async function copyImageToClipboard(src) {
  try {
    // Load image to canvas (handles CORS/formats)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Image load failed'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    });

    // Focus for Clipboard API
    document.body.focus();

    // Write blob
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    console.log('Offscreen copy succeeded');
    chrome.runtime.sendMessage({ type: 'COPIED' });

    // Clean up and close
    chrome.offscreen.closeDocument();
  } catch (error) {
    console.error('Offscreen copy failed:', error);
    chrome.runtime.sendMessage({ type: 'COPY_ERROR', error });
    chrome.offscreen.closeDocument();
  }
}