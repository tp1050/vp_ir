
// Service worker: Handles download requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadJson') {
    console.log('Background: Received download request for', request.filename);

    const blob = new Blob([request.jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: blobUrl,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Background: Download failed:', chrome.runtime.lastError);
      } else {
        console.log('Background: Download started, ID:', downloadId);
      }
      URL.revokeObjectURL(blobUrl);
      sendResponse({ success: true });
    });

    return true;  // Async response
  }
});