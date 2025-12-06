chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyToPhotos",
    title: "Copy & Open Photos Paste",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyToPhotos") {
    console.log('Copying and navigating...');
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyImageToClipboard,
      args: [info.srcUrl]
    }).then(() => {
      // Navigate current tab to Photos
      chrome.tabs.update(tab.id, { url: 'https://photos.google.com/' });
      // Open popup after delay (for load)
      setTimeout(() => {
        chrome.action.openPopup();
      }, 2500);
    }).catch(err => console.error('Copy failed:', err));
  }
});

async function copyImageToClipboard(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Not image');
    
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    console.log('Copied to clipboard');
  } catch (error) {
    // Fallback canvas...
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      console.log('Fallback copy done');
    };
  }
}