> **⚠️ This repository is archived and no longer maintained.**
>
> ChatWeave has been rewritten as a new project, **Oibako (笈箱)**: https://github.com/spiritherb02/Oibako
>
> The rewrite redoes the conversion and database-writing layer. It merges DeepSeek (current and legacy exports) and ChatGPT official exports into a RikkaHub backup, and ships a single-file web app that runs entirely in the browser.
>
> This repo is kept for historical reference only. Issues and pull requests are closed.

---

﻿# ChatWeave

ChatWeave is a local-first conversation migration toolkit.

It focuses on one thing: import, review, edit, and merge chat history into a RikkaHub-compatible backup package that can continue to be used.

## Components

- `index.html`: main merge tool and conversation workspace
- `edge_exporter_lite/`: companion browser exporter extension
- `sync_version.js`: one-command version sync script
- `chatweave-version.json`: single version source of truth

## What It Supports

- ChatGPT official export ZIP
- DeepSeek export ZIP (new and old formats)
- Grok official export ZIP
- Exported JSON from YourAIScroll or ChatWeave Exporter
- Markdown paste flow for single-conversation imports
- RikkaHub backup merge output

## Quick Start

1. Open `index.html` in a modern browser.
2. Import source data and review conversations in the workspace.
3. Choose a RikkaHub backup ZIP.
4. Merge and download the new backup ZIP.
5. Import the merged backup into RikkaHub.

## Versioning

ChatWeave main tool and ChatWeave Exporter extension share the same version.

Current source of truth:

- `chatweave-version.json`

## Release Workflow

Check current version:

```bash
node sync_version.js
```

Bump to a new version (supports prerelease like `-beta.1`) and sync all targets:

```bash
node sync_version.js 1.7.2-beta.1
```

This script updates:

- `index.html`
- `edge_exporter_lite/manifest.json`
- `edge_exporter_lite/popup.js`

## Extension Packaging

The extension source lives in:

- `edge_exporter_lite/`

The packaged archive is:

- `edge_exporter_lite.zip`

After changing extension files, repackage it before release.

## Privacy

ChatWeave is designed for local processing. Keep your original exports and backup ZIPs until you finish verification.

## Project Link

- GitHub: `https://github.com/SpiritHerb/ChatWeave`
