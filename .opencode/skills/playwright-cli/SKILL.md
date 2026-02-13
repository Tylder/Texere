---
name: playwright-cli
description:
  'Browser automation and testing with Playwright CLI. Use for web automation, testing, screenshot
  capture, and interactive browser workflows.'
license: MIT
---

# Playwright Automation

Command-line tool for browser automation and testing. Token-efficient CLI approach—no page data
forced into context.

## Installation

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

## Core Commands

### Navigation

```bash
playwright-cli open <url> [--headed]           # Open URL in browser
playwright-cli go-back                         # Go to previous page
playwright-cli go-forward                      # Go to next page
playwright-cli reload                          # Reload current page
```

### Interaction

```bash
playwright-cli type <text>                     # Type text into focused element
playwright-cli click <ref>                     # Click element by reference
playwright-cli dblclick <ref>                  # Double-click element
playwright-cli fill <ref> <text>               # Fill input field
playwright-cli check <ref>                     # Check checkbox/radio
playwright-cli uncheck <ref>                   # Uncheck checkbox/radio
playwright-cli select <ref> <value>            # Select dropdown option
playwright-cli drag <startRef> <endRef>        # Drag and drop
playwright-cli hover <ref>                     # Hover over element
playwright-cli press <key>                     # Press keyboard key
playwright-cli upload <file>                   # Upload files
```

### Inspection

```bash
playwright-cli snapshot                        # Capture page snapshot (get element refs)
playwright-cli screenshot [ref]                # Take screenshot
playwright-cli console [min-level]             # Get console messages
playwright-cli network                         # List network requests
playwright-cli eval <func> [ref]               # Run JavaScript on page
```

### Tabs & Windows

```bash
playwright-cli tab-list                        # List all open tabs
playwright-cli tab-new [url]                   # Open new tab
playwright-cli tab-select <index>              # Switch to tab
playwright-cli tab-close [index]               # Close tab
```

### Sessions

```bash
playwright-cli session-list                    # List all sessions
playwright-cli session-stop [name]             # Stop session
playwright-cli session-delete [name]           # Delete session data
playwright-cli --session=<name> <command>      # Use specific session
```

## Element References

Use `snapshot` to get element references:

```bash
playwright-cli snapshot              # Shows page with element refs (e21, e35, etc.)
playwright-cli click e21             # Click element with ref e21
playwright-cli type e35 "text here"  # Type into element e35
```

## Common Workflows

### Test a Form

```bash
playwright-cli open https://example.com
playwright-cli snapshot                    # Get element refs
playwright-cli fill e1 "email@test.com"
playwright-cli fill e2 "password123"
playwright-cli click e3                    # Submit button
playwright-cli screenshot                  # Verify result
```

### Multi-Tab Testing

```bash
playwright-cli open https://example.com
playwright-cli tab-new https://other.com
playwright-cli --session=alt-session open https://another.com
playwright-cli session-list              # See all sessions
```

### Take Screenshots

```bash
playwright-cli open https://example.com/page
playwright-cli screenshot                          # Full page
playwright-cli screenshot e42                      # Element only
```

### Headed Mode (for debugging)

```bash
playwright-cli open https://example.com --headed   # See browser window
playwright-cli --headed type "search term"
```

## Configuration

Create `playwright-cli.json` in project root:

```json
{
  "headless": false,
  "slowMo": 500,
  "timeout": 30000
}
```

Then reference it:

```bash
playwright-cli --config playwright-cli.json open https://example.com
```

## Approach & Best Practices

1. **Get element refs first**: Always run `snapshot` before interacting to get correct element
   references
2. **Verify with screenshots**: After actions, take `screenshot` to confirm state
3. **Use sessions for isolation**: Test multiple scenarios with separate `--session` calls
4. **Headed debugging**: Use `--headed` when tests behave unexpectedly
5. **Check console/network**: Use `console` and `network` commands to debug issues

## When to Use

- Website testing and verification
- Form filling and automation
- Multi-page workflows
- Screenshot capture for visual testing
- Interactive browser workflows where you need step-by-step control
