# Tumblr Dashboard Bookmark Highlighter

Tumblr's "last read here" bookmark on the dashboard with a glowing gold marker, making it easy to spot where you left off.

## Features

- Detects Tumblr's built-in "last read here" bookmark on the dashboard
- Displays a glowing gold marker with a bookmark emoji
- Filters out fake bookmarks (community recommendations, etc.)
- Lightweight: uses `requestAnimationFrame` for smooth performance

## Install

### Firefox

1. Download the latest `.xpi` file from [Releases](../../releases)
2. Drag and drop the `.xpi` file into Firefox

### Chrome

1. Download and unzip the latest release
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the unzipped folder

## How It Works

Tumblr inserts elements with `data-cell-id` containing `timelineObject:title` to mark where you last read. This extension finds the real bookmark (filtering out fakes by checking for a trailing 32-character hex hash) and overlays a visible gold marker.

## License

MIT
