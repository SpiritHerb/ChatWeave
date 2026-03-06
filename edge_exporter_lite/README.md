# ChatWeave Conversation Exporter

Companion exporter extension for ChatWeave.

It extracts conversations from supported chat pages and exports them as Markdown, JSON, Text, or HTML.

## Install In Edge

1. Open `edge://extensions/`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `edge_exporter_lite` folder

## Export Formats

- `JSON`: structured export for ChatWeave import
- `Markdown`: `Original URL + [ROLE]` style paste-friendly format
- `Text`: plain text export
- `HTML`: local preview page

## Extraction Strategy

- API first when a platform exposes usable page-side APIs
- DOM fallback when API extraction is unavailable

## Supported Platforms

- ChatGPT
- Claude
- DeepSeek
- Grok
- Gemini / Google AI Studio
- Kimi
- Mistral
- Copilot
- GitHub Copilot
- Perplexity
- Poe

## JSON Identification

JSON exports include ChatWeave-specific metadata so the main tool can distinguish them from other exporters.

Fields include:

- `exportedBy`
- `exportVersion`
- `exportFormat`
- `exportMeta.tool`
- `exportMeta.schema`
- `exportMeta.platform`

## Versioning

This extension shares the same version as the main ChatWeave tool.

Single source of truth:

- `../chatweave-version.json`

Sync command:

```bash
node sync_version.js
```

Version bump command:

```bash
node sync_version.js 1.7.2
```

## Packaging

To ship the extension, package the `edge_exporter_lite` folder into `edge_exporter_lite.zip`.
