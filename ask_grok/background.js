// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ask-grok",
    title: "Ask Grok: \"%s\"",
    contexts: ["selection"]
  });
});

// Handle click: Open Grok tab + store text
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-grok" && info.selectionText) {
    const query = info.selectionText.trim();
    
    // Store query in storage for content script
    chrome.storage.session.set({ grokQuery: query });
    
    // Open Grok interface
    chrome.tabs.create({ 
      url: 'https://x.com/i/grok',
      active: true 
    });
  }
});