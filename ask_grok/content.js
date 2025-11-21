// Listen for storage change (triggered by background)
chrome.storage.session.get(['grokQuery'], (result) => {
  if (result.grokQuery) {
    const query = result.grokQuery;
    
    // Wait a bit for page to fully load
    setTimeout(() => {
      // Common selectors for Grok input (text area or div[contenteditable])
      const inputSelectors = [
        'div[role="textbox"]',
        'textarea',
        '[data-testid="grok-composer"]',
        '.r-1ny4l3l'  // Common X CSS class for editable inputs
      ];
      
      let input = null;
      for (const selector of inputSelectors) {
        input = document.querySelector(selector);
        if (input) break;
      }
      
      if (input) {
        // Clear and paste text
        input.focus();
        input.textContent = '';
        input.textContent = query;
        
        // Trigger input event to notify React
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Optional: Auto-submit (uncomment next line)
        // setTimeout(() => input.closest('form')?.submit() || input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})), 500);
        
        console.log('Pasted query to Grok:', query);
        
        // Clear storage
        chrome.storage.session.remove(['grokQuery']);
      } else {
        console.warn('Grok input not found—page may need refresh');
      }
    }, 1500);  // Adjust delay if needed (1.5s for load)
  }
});