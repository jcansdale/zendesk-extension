# Zendesk Custom Search Extension

A Chrome browser extension that provides a custom search interface for Zendesk with support for custom fields.

## Features

- **Quick Search**: Search Zendesk tickets with a user-friendly interface
- **Standard Filters**: Filter by status, priority, assignee, requester, and tags
- **Custom Fields Support**: 
  - Add custom field mappings with friendly names
  - Custom fields appear as regular form fields
- **Live Sync**: Updates the Zendesk search box in real-time as you type
- **Auto-populate**: Opens with current search query pre-filled when on a Zendesk search page
- **Configurable Fields**: Show/hide standard fields you don't need
- **Query Preview**: See the generated Zendesk search query before executing
- **Keyboard Shortcuts**: Press Enter in any field to search

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `zendesk-extension` folder
6. The extension icon will appear in your toolbar

## Usage

### Searching Tickets

1. Navigate to any Zendesk page
2. Click the extension icon
3. Enter your search criteria:
   - **Search Query**: Free text search
   - **Status**: Filter by ticket status (new, open, pending, hold, solved, closed)
   - **Priority**: Filter by priority level
   - **Assignee**: Use `me` for yourself, `none` for unassigned, or a name/email
   - **Requester**: Use `me` or a name/email
   - **Tags**: Comma-separated list of tags

4. Press **Enter** or click **Search** to execute
5. The search opens in your current Zendesk tab

### Custom Fields

Custom fields you configure appear as regular form fields alongside Status, Priority, etc.

#### Adding Custom Fields

1. Expand **"Manage custom fields"** at the bottom
2. Enter the Field Name (e.g., `Product Type`)
3. Enter the Field ID (e.g., `12345678`)
4. Click **Add**

The field immediately appears in the search form.

#### Finding Custom Field IDs

1. Go to Zendesk Admin → Objects and Rules → Tickets → Fields
2. Click on a custom field
3. The ID is in the URL or shown in the field settings

### Managing Standard Fields

Don't need certain fields? Hide them:

1. Expand **"Manage standard fields"**
2. Uncheck fields you want to hide
3. Your preferences are saved automatically

### Live Search Box Sync

As you fill in the form, the Zendesk search box updates in real-time behind the popup. You can:
- Click **Search** to execute immediately
- Or close the popup and press Enter in Zendesk's search box

### Auto-populate from Current Search

When you open the extension on a Zendesk search page, it reads the current query and populates the form fields - making it easy to modify existing searches.

## Zendesk Search Syntax

This extension generates Zendesk search queries using their syntax:

- `status:open` - Tickets with open status
- `priority:high` - High priority tickets
- `assignee:me` - Tickets assigned to you
- `assignee:none` - Unassigned tickets
- `requester:me` - Tickets you requested
- `tags:urgent` - Tickets with the "urgent" tag
- `custom_field_12345:value` - Custom field search

## Permissions

- **storage**: Saves your custom field mappings and field visibility preferences
- **tabs**: Detects Zendesk subdomain and navigates to search results
- **activeTab**: Interacts with the current Zendesk page
- **host_permissions (zendesk.com)**: Allows reading/updating the Zendesk search box

## License

MIT License
