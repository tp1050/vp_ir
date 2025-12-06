document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('pasteBtn');
  const status = document.getElementById('status');
  let tabId = null;

  // Get active tab on load
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    tabId = tabs[0].id;
  });

  btn.addEventListener('click', () => {
    if (!tabId) return;
    status.textContent = 'Pasting...';
    btn.disabled = true;

    chrome.scripting.executeScript({
      target: { tabId },
      func: simulateTrustedPaste
    }).then(() => {
      status.textContent = 'Paste sent—check Photos!';
      setTimeout(() => window.close(), 2000);
    }).catch(err => {
      status.textContent = 'Failed: ' + err.message;
      btn.disabled = false;
    });
  });
});

async function simulateTrustedPaste() {
  // Assume tab is already on Photos (from background)
  const pasteTarget = document.querySelector('.library-container, .photos-grid, body') || document.body;
  pasteTarget.focus();

  // Read clipboard (from earlier copy)
  const items = await navigator.clipboard.read();
  let imageBlob = null;
  let imageType = null;
  for (let item of items) {
    for (let type of item.types) {
      if (type.startsWith('image/')) {
        imageBlob = await item.getType(type);
        imageType = type;
        break;
      }
    }
    if (imageBlob) break;
  }

  if (imageBlob) {
    // Build DataTransfer
    const dt = new DataTransfer();
    dt.items.add(imageBlob, imageType);

    // Dispatch on button click gesture
    const pasteEvent = new ClipboardEvent('paste', { 
      clipboardData: dt,
      bubbles: true,
      cancelable: true
    });
    pasteTarget.dispatchEvent(pasteEvent);
    console.log('Trusted-chained paste dispatched');
  } else {
    // Fallback keys
    const keydown = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true });
    pasteTarget.dispatchEvent(keydown);
    const keyup = new KeyboardEvent('keyup', { key: 'v', ctrlKey: true, bubbles: true });
    pasteTarget.dispatchEvent(keyup);
    console.log('Key fallback dispatched');
  }
}