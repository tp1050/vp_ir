// Create the context menu item when the extension loads
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendWhatsApp",
    title: "Send WhatsApp Message",
    contexts: ["selection"]  // Only show when text is selected
  });
});

// Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendWhatsApp" && info.selectionText) {
    const phoneNumber = info.selectionText.trim();
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    chrome.tabs.create({ url: whatsappUrl });
  }
});