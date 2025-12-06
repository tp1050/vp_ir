// Create context menu item on install/reload
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "search-shops",
    title: "Search '%s' on Iranian Shops",
    contexts: ["selection"],  // Only shows on selected text
    documentUrlPatterns: ["<all_urls>"]  // Works on any site
  });
});

// Listen for menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "search-shops" && info.selectionText) {
    const query = encodeURIComponent(info.selectionText.trim());
    
    // Construct search URLs
    const urls = [
      `https://snappshop.ir/search?query=${query}`,
      `https://tapsi.shop/search/?term=${query}`,
      `https://www.digikala.com/search/?q=${query}`,
      `https://torob.com/search/?query=${query}`,
      `https://www.google.com/search?q=${query}+site:emalls.ir`  // Google-fied emalls search
    ];
    
    // Open each in a new inactive (background) tab
    urls.forEach(url => {
      chrome.tabs.create({ url, active: false });
    });
  }
});