// Content script to interact with Zendesk search

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSearchQuery') {
    const query = extractSearchQuery();
    sendResponse({ query: query });
  } else if (request.action === 'setSearchQuery') {
    const success = setSearchQuery(request.query);
    sendResponse({ success: success });
  }
  return true; // Keep the message channel open for async response
});

function getSearchInput() {
  const selectors = [
    'input[aria-label*="search" i]',
    'input[data-test-id="search-input"]',
    'input[data-testid="search-input"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    '[data-test-id="search-box"] input',
    '[role="search"] input',
    'input[type="search"]',
  ];
  
  for (const selector of selectors) {
    try {
      const input = document.querySelector(selector);
      if (input) {
        return input;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

function extractSearchQuery() {
  // Check URL for search query parameter first
  const url = new URL(window.location.href);
  const urlQuery = url.searchParams.get('q') || url.searchParams.get('query');
  if (urlQuery) {
    return urlQuery;
  }

  const input = getSearchInput();
  if (input && (input.value || input.textContent)) {
    return input.value || input.textContent;
  }
  
  // Fallback: look for any input containing Zendesk query syntax
  const textInputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  for (const input of textInputs) {
    const val = input.value || '';
    if (val && (
      val.includes('status:') ||
      val.includes('assignee:') ||
      val.includes('priority:') ||
      val.includes('requester:') ||
      val.includes('tags:') ||
      val.includes('custom_field_') ||
      val.includes('type:')
    )) {
      return val;
    }
  }
  
  return null;
}

function setSearchQuery(query) {
  const input = getSearchInput();
  if (!input) {
    return false;
  }
  
  // Set the value
  input.value = query;
  
  // Trigger input events so React/Zendesk picks up the change
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Also try setting via native setter for React controlled inputs
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, query);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  
  return true;
}


