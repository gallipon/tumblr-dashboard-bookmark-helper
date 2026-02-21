# Tumblr Dashboard Bookmark Helper

Highlights Tumblr's "last read here" bookmark on the dashboard with a glowing gold marker, and lets you jump to it instantly.

## Features

- Detects Tumblr's built-in "last read here" bookmark on the dashboard
- Displays a glowing gold marker with a bookmark emoji
- **Find Bookmark button**: scrolls the feed to find and jump to your bookmark
- Customizable marker color, text, and behavior via the options page
- Filters out fake bookmarks (community recommendations, etc.)
- Lightweight: uses `requestAnimationFrame` for smooth performance

## Install

### Firefox

Install from [Firefox Add-ons (AMO)](https://addons.mozilla.org/ja/firefox/addon/tumblr-bookmark-helper/).

### Chrome

1. Download and unzip the latest release
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the unzipped folder

## How It Works

Tumblr inserts elements with `data-cell-id` containing `timelineObject:title` to mark where you last read. This extension finds the real bookmark (filtering out fakes by checking for a trailing 32-character hex hash) and overlays a visible gold marker.

## License

MIT
