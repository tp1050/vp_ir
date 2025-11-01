console.log("🔥 Torob Extension: Service worker STARTED");

chrome.runtime.onInstalled.addListener(() => {
  console.log("🟢 Creating context menu...");
  chrome.contextMenus.create({
    id: "searchTorob",
    title: "Search on Torob",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("❌ Menu create failed:", chrome.runtime.lastError);
    } else {
      console.log("✅ Context menu created!");
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchTorob" && info.selectionText) {
    const query = encodeURIComponent(info.selectionText.trim());
    const url = `https://torob.com/search/?query=${query}`;
    console.log("🚀 Opening:", url);
    chrome.tabs.create({ url });
  }
});