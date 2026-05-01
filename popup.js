// DOM Elements
const searchQueryInput = document.getElementById('searchQuery');
const statusSelect = document.getElementById('status');
const prioritySelect = document.getElementById('priority');
const assigneeInput = document.getElementById('assignee');
const requesterInput = document.getElementById('requester');
const tagsInput = document.getElementById('tags');
const customFieldsContainer = document.getElementById('customFieldsContainer');
const savedFieldsList = document.getElementById('savedFieldsList');
const newFieldIdInput = document.getElementById('newFieldId');
const newFieldNameInput = document.getElementById('newFieldName');
const saveFieldBtn = document.getElementById('saveField');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const queryPreview = document.getElementById('queryPreview');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedFields();
  loadFieldVisibility();
  populateFromCurrentSearch();
  updateQueryPreview();
  attachEventListeners();
});

// Event Listeners
function attachEventListeners() {
  // Search form inputs - update preview on change
  const inputs = [searchQueryInput, statusSelect, prioritySelect, assigneeInput, requesterInput, tagsInput];
  inputs.forEach(input => {
    input.addEventListener('input', updateQueryPreview);
    input.addEventListener('change', updateQueryPreview);
    input.addEventListener('keydown', handleEnterKey);
  });

  // Custom fields container - listen for input changes and enter key
  customFieldsContainer.addEventListener('input', updateQueryPreview);
  customFieldsContainer.addEventListener('keydown', handleEnterKey);

  // Saved fields management
  saveFieldBtn.addEventListener('click', saveFieldMapping);
  savedFieldsList.addEventListener('click', handleSavedFieldAction);

  // Field visibility toggles
  const toggles = document.querySelectorAll('.field-toggles input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', handleFieldVisibilityChange);
  });

  // Search actions
  searchBtn.addEventListener('click', executeSearch);
  clearBtn.addEventListener('click', clearForm);
}

// Handle Enter key to trigger search
function handleEnterKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    executeSearch();
  }
}

// Field Visibility Management
const STANDARD_FIELDS = ['status', 'priority', 'assignee', 'requester', 'tags'];

// Populate form from current Zendesk search
async function populateFromCurrentSearch() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  if (!currentTab || !currentTab.url) return;
  
  // Check if it's a Zendesk page
  const zendeskMatch = currentTab.url.match(/^https?:\/\/[^.]+\.zendesk\.com/);
  if (!zendeskMatch) return;
  
  try {
    // Ask the content script to get the search query from the page
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getSearchQuery' });
    if (response && response.query) {
      parseAndPopulateQuery(response.query);
      updateQueryPreview();
    }
  } catch (e) {
    // Content script might not be loaded yet, that's okay
    console.log('Could not get search query from page:', e.message);
  }
}

function parseAndPopulateQuery(query) {
  // Helper to extract value (handles quoted and unquoted values)
  function extractValue(match) {
    const value = match[1];
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }

  // Pattern that handles both quoted and unquoted values
  // Matches: field:"quoted value" or field:unquoted_value
  const valuePattern = '(?:"[^"]*"|\'[^\']*\'|\\S+)';
  
  const fieldPatterns = {
    status: {
      positive: new RegExp(`\\bstatus:(${valuePattern})`, 'gi'),
    },
    priority: {
      positive: new RegExp(`\\bpriority:(${valuePattern})`, 'gi'),
    },
    assignee: {
      positive: new RegExp(`\\bassignee:(${valuePattern})`, 'gi'),
      negated: new RegExp(`-assignee:(${valuePattern})`, 'gi'),
    },
    requester: {
      positive: new RegExp(`\\brequester:(${valuePattern})`, 'gi'),
      negated: new RegExp(`-requester:(${valuePattern})`, 'gi'),
    },
    tags: {
      positive: new RegExp(`\\btags:(${valuePattern})`, 'gi'),
      negated: new RegExp(`-tags:(${valuePattern})`, 'gi'),
    },
  };
  
  // Negated custom field pattern: -custom_field_12345:value
  // Process negated matches first, so the positive regex doesn't partially match inside.
  const customFieldNegatedPattern = new RegExp(`-custom_field_(\\d+):(${valuePattern})`, 'gi');
  // Custom field pattern: custom_field_12345:value or custom_field_12345:"quoted value"
  // Avoid matching when preceded by '-', to prevent double-processing.
  const customFieldPattern = new RegExp(`(?<!-)\\bcustom_field_(\\d+):(${valuePattern})`, 'gi');
  
  let remainingQuery = query;
  
  // Extract standard fields
  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    const matches = [...query.matchAll(patterns.positive)];
    if (matches.length > 0) {
      if (field === 'status' || field === 'priority') {
        // For selects, use the first match
        const element = document.getElementById(field);
        if (element) {
          element.value = extractValue(matches[0]).toLowerCase();
        }
      } else if (field === 'tags') {
        // Combine all tag matches (positive tags)
        const positiveTags = matches.map(m => extractValue(m));
        // Also get negated tags
        const negatedMatches = patterns.negated ? [...query.matchAll(patterns.negated)] : [];
        const negativeTags = negatedMatches.map(m => '-' + extractValue(m));
        // Remove negated tag matches from remaining query
        negatedMatches.forEach(m => {
          remainingQuery = remainingQuery.replace(m[0], '');
        });
        const allTags = [...positiveTags, ...negativeTags].join(', ');
        const element = document.getElementById('tags');
        if (element) element.value = allTags;
      } else if (field === 'assignee' || field === 'requester') {
        // For text inputs (assignee, requester). Support negated version by prefixing '-'.
        const negatedMatches = patterns.negated ? [...query.matchAll(patterns.negated)] : [];

        const element = document.getElementById(field);
        if (element) {
          if (negatedMatches.length > 0) {
            element.value = '-' + extractValue(negatedMatches[0]);
          } else {
            element.value = extractValue(matches[0]);
          }
        }

        // Remove negated match (if present) from remaining query
        negatedMatches.forEach(m => {
          remainingQuery = remainingQuery.replace(m[0], '');
        });
      } else {
        // For any other text inputs
        const element = document.getElementById(field);
        if (element) element.value = extractValue(matches[0]);
      }
      
      // Remove matched parts from remaining query
      matches.forEach(m => {
        remainingQuery = remainingQuery.replace(m[0], '');
      });
    }
  }
  
  // Extract custom fields (including negated ones)
  const customNegatedMatches = [...query.matchAll(customFieldNegatedPattern)];
  const customMatches = [...query.matchAll(customFieldPattern)];
  
  // Process negated custom fields first
  customNegatedMatches.forEach(match => {
    const fieldId = match[1];
    const value = match[2];
    // Remove quotes if present
    const cleanValue = (value.startsWith('"') && value.endsWith('"')) || 
                       (value.startsWith("'") && value.endsWith("'"))
                       ? value.slice(1, -1) : value;
    
    // Try to find an existing input for this custom field
    const input = document.querySelector(`input[data-field-id="${fieldId}"]`);
    if (input) {
      // Prefix with `-` to indicate negation
      input.value = '-' + cleanValue;
    }
    
    remainingQuery = remainingQuery.replace(match[0], '');
  });

  // Process positive custom fields
  customMatches.forEach(match => {
    const fieldId = match[1];
    const value = match[2];
    // Remove quotes if present
    const cleanValue = (value.startsWith('"') && value.endsWith('"')) || 
                       (value.startsWith("'") && value.endsWith("'"))
                       ? value.slice(1, -1) : value;
    
    // Try to find an existing input for this custom field
    const input = document.querySelector(`input[data-field-id="${fieldId}"]`);
    if (input) {
      input.value = cleanValue;
    }
    
    remainingQuery = remainingQuery.replace(match[0], '');
  });
  
  // Whatever remains goes in the search query field
  remainingQuery = remainingQuery.trim().replace(/\s+/g, ' ');
  if (remainingQuery) {
    searchQueryInput.value = remainingQuery;
  }
}

function loadFieldVisibility() {
  chrome.storage.sync.get(['fieldVisibility'], (result) => {
    const visibility = result.fieldVisibility || {};
    
    STANDARD_FIELDS.forEach(field => {
      const isVisible = visibility[field] !== false; // Default to visible
      const toggle = document.getElementById(`toggle-${field}`);
      const formGroup = document.querySelector(`.field-${field}`);
      
      if (toggle) toggle.checked = isVisible;
      if (formGroup) formGroup.classList.toggle('hidden', !isVisible);
    });
  });
}

function handleFieldVisibilityChange(e) {
  const fieldName = e.target.id.replace('toggle-', '');
  const isVisible = e.target.checked;
  const formGroup = document.querySelector(`.field-${fieldName}`);
  
  if (formGroup) {
    formGroup.classList.toggle('hidden', !isVisible);
  }
  
  // Save visibility preferences
  chrome.storage.sync.get(['fieldVisibility'], (result) => {
    const visibility = result.fieldVisibility || {};
    visibility[fieldName] = isVisible;
    
    chrome.storage.sync.set({ fieldVisibility: visibility });
  });
}

// Saved Fields Management
function loadSavedFields() {
  chrome.storage.sync.get(['savedCustomFields'], (result) => {
    const fields = result.savedCustomFields || [];
    renderCustomFieldInputs(fields);
    renderSavedFieldsList(fields);
  });
}

function renderCustomFieldInputs(fields) {
  if (fields.length === 0) {
    customFieldsContainer.innerHTML = '';
    return;
  }

  customFieldsContainer.innerHTML = fields.map(field => `
    <div class="form-group" data-field-id="${field.id}">
      <label for="cf_${field.id}">${escapeHtml(field.name)}</label>
      <input type="text" id="cf_${field.id}" class="custom-field-input" data-field-id="${field.id}" placeholder="Enter ${escapeHtml(field.name).toLowerCase()}..." />
    </div>
  `).join('');
}

function renderSavedFieldsList(fields) {
  if (fields.length === 0) {
    savedFieldsList.innerHTML = '<p class="no-fields-msg">No custom fields configured.</p>';
    return;
  }

  savedFieldsList.innerHTML = fields.map((field, index) => `
    <div class="saved-field-row" data-index="${index}">
      <span class="saved-field-name">${escapeHtml(field.name)}</span>
      <span class="saved-field-id">ID: ${field.id}</span>
      <button class="btn-delete-field" data-action="delete" data-index="${index}" title="Remove">✕</button>
    </div>
  `).join('');
}

function saveFieldMapping() {
  const fieldId = newFieldIdInput.value.trim();
  const fieldName = newFieldNameInput.value.trim();

  if (!fieldId || !fieldName) {
    showNotification('Please enter both field ID and name');
    return;
  }

  chrome.storage.sync.get(['savedCustomFields'], (result) => {
    const fields = result.savedCustomFields || [];
    
    // Check for duplicates
    const exists = fields.some(f => f.id === fieldId);
    if (exists) {
      showNotification('Field ID already exists');
      return;
    }

    fields.push({ id: fieldId, name: fieldName });
    
    chrome.storage.sync.set({ savedCustomFields: fields }, () => {
      newFieldIdInput.value = '';
      newFieldNameInput.value = '';
      loadSavedFields();
      showNotification('Field mapping saved!');
    });
  });
}

function handleSavedFieldAction(e) {
  const action = e.target.dataset.action;
  
  if (action === 'delete') {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index);
    deleteSavedField(index);
  }
}

function deleteSavedField(index) {
  chrome.storage.sync.get(['savedCustomFields'], (result) => {
    const fields = result.savedCustomFields || [];
    fields.splice(index, 1);
    
    chrome.storage.sync.set({ savedCustomFields: fields }, () => {
      loadSavedFields();
      showNotification('Field removed');
    });
  });
}

// Query Building
function buildSearchQuery() {
  const parts = [];

  // Helper to quote values with spaces
  function quoteIfNeeded(value) {
    if (value.includes(' ') && !value.startsWith('"')) {
      return `"${value}"`;
    }
    return value;
  }

  // Basic search query
  const query = searchQueryInput.value.trim();
  if (query) {
    parts.push(query);
  }

  // Status
  const status = statusSelect.value;
  if (status) {
    parts.push(`status:${status}`);
  }

  // Priority
  const priority = prioritySelect.value;
  if (priority) {
    parts.push(`priority:${priority}`);
  }

  // Assignee
  const assignee = assigneeInput.value.trim();
  if (assignee) {
    parts.push(`assignee:${quoteIfNeeded(assignee)}`);
  }

  // Requester
  const requester = requesterInput.value.trim();
  if (requester) {
    parts.push(`requester:${quoteIfNeeded(requester)}`);
  }

  // Tags (supports `-` prefix for NOT searches, e.g., "-auto_response_solved")
  const tags = tagsInput.value.trim();
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
    tagList.forEach(tag => {
      const isNegated = tag.startsWith('-');
      const cleanTag = isNegated ? tag.slice(1) : tag;
      const prefix = isNegated ? '-' : '';
      parts.push(`${prefix}tags:${quoteIfNeeded(cleanTag)}`);
    });
  }

  // Custom fields (supports `-` prefix for NOT searches, e.g., "-foo bar baz")
  const customFieldInputs = customFieldsContainer.querySelectorAll('.custom-field-input');
  customFieldInputs.forEach(input => {
    const fieldId = input.dataset.fieldId;
    const value = input.value.trim();
    if (fieldId && value) {
      const isNegated = value.startsWith('-');
      const cleanValue = isNegated ? value.slice(1) : value;
      const prefix = isNegated ? '-' : '';
      parts.push(`${prefix}custom_field_${fieldId}:${quoteIfNeeded(cleanValue)}`);
    }
  });

  return parts.join(' ');
}

function updateQueryPreview() {
  const query = buildSearchQuery();
  queryPreview.innerHTML = query 
    ? `<code>${escapeHtml(query)}</code>` 
    : '<code>Enter search criteria above...</code>';
  
  // Also update the Zendesk search box in real-time
  updateZendeskSearchBox(query);
}

// Update the Zendesk search input on the page
async function updateZendeskSearchBox(query) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (!currentTab || !currentTab.url) return;
    
    // Only update if we're on a Zendesk page
    if (!currentTab.url.match(/^https?:\/\/[^.]+\.zendesk\.com/)) return;
    
    await chrome.tabs.sendMessage(currentTab.id, { 
      action: 'setSearchQuery', 
      query: query || '' 
    });
  } catch (e) {
    // Content script might not be loaded, that's okay
  }
}

// Search Execution
async function executeSearch() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  if (!currentTab || !currentTab.url) {
    showNotification('Please open a Zendesk page first');
    return;
  }
  
  const match = currentTab.url.match(/^https?:\/\/([^.]+)\.zendesk\.com/);
  if (!match || !match[1]) {
    showNotification('Please open a Zendesk page first');
    return;
  }
  
  const subdomain = match[1];
  const query = buildSearchQuery();
  if (!query) {
    showNotification('Please enter search criteria');
    return;
  }

  const searchUrl = `https://${subdomain}.zendesk.com/agent/search/1?type=ticket&q=${encodeURIComponent(query)}`;
  
  // Navigate the current Zendesk tab instead of opening a new one
  chrome.tabs.update(currentTab.id, { url: searchUrl });
  window.close(); // Close the popup
}

// Form Actions
function clearForm() {
  searchQueryInput.value = '';
  statusSelect.value = '';
  prioritySelect.value = '';
  assigneeInput.value = '';
  requesterInput.value = '';
  tagsInput.value = '';

  // Clear all custom field inputs
  const customFieldInputs = customFieldsContainer.querySelectorAll('.custom-field-input');
  customFieldInputs.forEach(input => input.value = '');

  updateQueryPreview();
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  // Simple notification - could be enhanced with a toast UI
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #03363d;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.2s';
    setTimeout(() => notification.remove(), 200);
  }, 2000);
}
