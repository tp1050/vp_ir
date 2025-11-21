// Persian (Eastern Arabic) to Latin digit mapping
function toLatinDigits(str) {
  const persianToLatin = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  return str.replace(/[۰-۹]/g, match => persianToLatin[match]);
}

// Normalize Iranian phone number for WhatsApp
function normalizeIranPhone(text) {
  let num = toLatinDigits(text).trim();
  
  // Keep only digits and + , remove other characters
  num = num.replace(/[^\d+]/g, '');
  
  if (num.startsWith('+')) {
    // Already international format, assume good
    return num;
  }
  
  // Now extract digits only
  let digits = num.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('09')) {
    // Local format: 09xxxxxxxxx → +989xxxxxxxx (slice(1) keeps the 9)
    return '+98' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    // Mobile part only: 9xxxxxxxx → +989xxxxxxxx
    return '+98' + digits;
  } else if (digits.length === 12 && digits.startsWith('98')) {
    // Bare international: 98xxxxxxxxxx → +98xxxxxxxxxx
    return '+' + digits;
  } else {
    // Fallback: Treat as-is (prepend + if needed)
    return '+' + digits;
  }
}

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
    const phoneNumber = normalizeIranPhone(info.selectionText);
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    chrome.tabs.create({ url: whatsappUrl });
  }
});