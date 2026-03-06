function t(key, substitutions) {
  try {
    const result = chrome.i18n.getMessage(key, substitutions);
    return result || key;
  } catch (error) {
    return key;
  }
}

const state = {
  tabId: null,
  tabUrl: '',
  platform: 'unknown',
  title: t('defaultConversationTitle'),
  cachedConversation: null,
  cachedAt: 0
};

const EXPORTER_META = {
  exportedBy: 'chatweave-exporter',
  exportVersion: '1.7.2-beta.1',
  exportFormat: 'json'
};

const KNOWN_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'chat.deepseek.com',
  'chat.qwen.ai',
  'grok.com',
  'gemini.google.com',
  'aistudio.google.com',
  'kimi.com',
  'chat.mistral.ai',
  'copilot.microsoft.com',
  'github.com',
  'perplexity.ai',
  'poe.com'
];

function detectPlatformFromUrl(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('chatgpt.com') || u.includes('chat.openai.com')) return 'chatgpt';
  if (u.includes('claude.ai')) return 'claude';
  if (u.includes('chat.deepseek.com')) return 'deepseek';
  if (u.includes('chat.qwen.ai')) return 'qwen';
  if (u.includes('grok.com')) return 'grok';
  if (u.includes('gemini.google.com')) return 'gemini';
  if (u.includes('aistudio.google.com')) return 'google-ai-studio';
  if (u.includes('kimi.com')) return 'kimi';
  if (u.includes('chat.mistral.ai')) return 'mistral';
  if (u.includes('copilot.microsoft.com')) return 'copilot';
  if (u.includes('github.com/copilot')) return 'github-copilot';
  if (u.includes('perplexity.ai')) return 'perplexity';
  if (u.includes('poe.com')) return 'poe';
  return 'unknown';
}

function prettyPlatform(platform) {
  const map = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    deepseek: 'DeepSeek',
    qwen: 'Qwen',
    grok: 'Grok',
    gemini: 'Gemini',
    'google-ai-studio': 'Google AI Studio',
    kimi: 'Kimi',
    mistral: 'Mistral',
    copilot: 'Copilot',
    'github-copilot': 'GitHub Copilot',
    perplexity: 'Perplexity',
    poe: 'Poe',
    unknown: t('platformUnknown')
  };
  return map[platform] || platform;
}

function setStatus(message, type = '') {
  const el = document.getElementById('status');
  el.textContent = message || '';
  el.className = `status ${type}`;
}

function setButtonsDisabled(disabled) {
  document.getElementById('copyMarkdown').disabled = !!disabled;
  document.getElementById('downloadBtn').disabled = !!disabled;
}

function setMetaText(text) {
  const meta = document.getElementById('meta');
  meta.textContent = text || '';
}

function getFormatLabel(value) {
  if (value === 'md') return t('formatMarkdown');
  if (value === 'txt') return t('formatText');
  if (value === 'html') return t('formatHtml');
  return t('formatJson');
}

function getFormatBadge(value) {
  if (value === 'md') return 'MD';
  if (value === 'txt') return 'TXT';
  if (value === 'html') return 'HTML';
  return 'JSON';
}

function syncFormatOptionState(value) {
  document.querySelectorAll('[data-format-value]').forEach((option) => {
    const selected = option.getAttribute('data-format-value') === value;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function setFormatValue(value) {
  const normalized = ['json', 'md', 'txt', 'html'].includes(value) ? value : 'json';
  const input = document.getElementById('formatSelect');
  const label = document.getElementById('formatSelectedLabel');
  const badge = document.getElementById('formatSelectedBadge');
  if (input) input.value = normalized;
  if (label) label.textContent = getFormatLabel(normalized);
  if (badge) badge.textContent = getFormatBadge(normalized);
  syncFormatOptionState(normalized);
}

function setFormatMenuOpen(open) {
  const picker = document.getElementById('formatPicker');
  const trigger = document.getElementById('formatTrigger');
  const overlay = document.getElementById('formatOverlay');
  if (!picker || !trigger || !overlay) return;
  picker.classList.toggle('open', !!open);
  overlay.classList.toggle('open', !!open);
  overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function initFormatPicker() {
  const picker = document.getElementById('formatPicker');
  const trigger = document.getElementById('formatTrigger');
  const input = document.getElementById('formatSelect');
  const menu = document.getElementById('formatMenu');
  const overlay = document.getElementById('formatOverlay');
  const overlayBody = document.getElementById('formatOverlayBody');
  const overlayClose = document.getElementById('formatOverlayClose');
  if (!picker || !trigger || !input || !menu || !overlay || !overlayBody || !overlayClose) return;

  if (overlayBody.children.length === 0) {
    while (menu.firstChild) {
      overlayBody.appendChild(menu.firstChild);
    }
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setFormatMenuOpen(!picker.classList.contains('open'));
  });

  document.querySelectorAll('[data-format-value]').forEach((option) => {
    option.addEventListener('click', (event) => {
      event.preventDefault();
      const value = option.getAttribute('data-format-value') || 'json';
      setFormatValue(value);
      setFormatMenuOpen(false);
    });
  });

  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target) && !overlay.contains(event.target)) {
      setFormatMenuOpen(false);
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      setFormatMenuOpen(false);
    }
  });

  overlayClose.addEventListener('click', () => {
    setFormatMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setFormatMenuOpen(false);
    }
  });

  setFormatValue(input.value || 'json');
}

function applyI18n() {
  const locale = chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'en';
  if (document && document.documentElement) {
    document.documentElement.lang = /^zh/i.test(locale) ? 'zh-CN' : 'en';
  }

  document.title = t('popupTitle');

  const title = document.getElementById('popupTitle');
  if (title) title.textContent = t('popupTitle');

  const heading = document.getElementById('popupHeading');
  if (heading) heading.textContent = t('popupHeading');

  const subtitle = document.getElementById('popupSubtitle');
  if (subtitle) subtitle.textContent = t('popupSubtitle');

  const sheetTitle = document.getElementById('formatSheetTitle');
  if (sheetTitle) sheetTitle.textContent = t('formatSheetTitle');

  const overlayClose = document.getElementById('formatOverlayClose');
  if (overlayClose) overlayClose.setAttribute('aria-label', t('buttonClose'));

  const meta = document.getElementById('meta');
  if (meta) meta.textContent = t('metaDetecting');

  const formatJsonOption = document.getElementById('formatJsonOption');
  const formatJsonOptionText = document.getElementById('formatJsonOptionText');
  if (formatJsonOptionText) formatJsonOptionText.textContent = t('formatJson');

  const formatMarkdownOption = document.getElementById('formatMarkdownOption');
  const formatMarkdownOptionText = document.getElementById('formatMarkdownOptionText');
  if (formatMarkdownOptionText) formatMarkdownOptionText.textContent = t('formatMarkdown');

  const formatTextOption = document.getElementById('formatTextOption');
  const formatTextOptionText = document.getElementById('formatTextOptionText');
  if (formatTextOptionText) formatTextOptionText.textContent = t('formatText');

  const formatHtmlOption = document.getElementById('formatHtmlOption');
  const formatHtmlOptionText = document.getElementById('formatHtmlOptionText');
  if (formatHtmlOptionText) formatHtmlOptionText.textContent = t('formatHtml');

  setFormatValue((document.getElementById('formatSelect') || {}).value || 'json');

  const copyBtn = document.getElementById('copyMarkdown');
  if (copyBtn) copyBtn.textContent = t('buttonCopyMarkdown');

  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) downloadBtn.textContent = t('buttonDownload');
}

function isSupportedUrl(url) {
  const lower = String(url || '').toLowerCase();
  return KNOWN_HOSTS.some(host => lower.includes(host));
}

function sanitizeFilenameSegment(text, fallback = t('defaultConversationTitle')) {
  const value = String(text || '').trim();
  const cleaned = value
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function buildFilename(platform, title, ext) {
  const now = new Date();
  const p = (v) => String(v).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const safePlatform = sanitizeFilenameSegment(prettyPlatform(platform), 'Chat');
  const safeTitle = sanitizeFilenameSegment(title, t('defaultConversationTitle')).slice(0, 80);
  return `${safePlatform}-${safeTitle}-${stamp}.${ext}`;
}

function normalizeExportRole(role) {
  const v = String(role || '').trim().toUpperCase();
  if (v === 'USER' || v === 'ASSISTANT' || v === 'SYSTEM' || v === 'TOOL') return v;
  return 'ASSISTANT';
}

function toMarkdown(conversation) {
  const header = `Original URL: ${conversation.url || ''}\n\n`;
  const body = (conversation.messages || [])
    .map((m) => `**[${normalizeExportRole(m.role)}]**\n\n${String(m.content || '').trim()}`)
    .join('\n\n');
  return header + body;
}

function toText(conversation) {
  const header = `Original URL: ${conversation.url || ''}\n\n`;
  const body = (conversation.messages || [])
    .map((m) => `[${normalizeExportRole(m.role)}]:\n${String(m.content || '').trim()}`)
    .join('\n\n');
  return header + body;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toHtml(conversation) {
  const title = escapeHtml(conversation.title || t('defaultConversationTitle'));
  const htmlLang = /^zh/i.test(chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'en') ? 'zh-CN' : 'en';
  const url = escapeHtml(conversation.url || '');
  const body = (conversation.messages || []).map((m) => {
    const role = normalizeExportRole(m.role);
    const roleClass = role === 'USER' ? 'user' : role === 'ASSISTANT' ? 'assistant' : 'other';
    const ts = m.timestamp ? `<div class="ts">${escapeHtml(m.timestamp)}</div>` : '';
    const content = escapeHtml(String(m.content || '')).replace(/\n/g, '<br>');
    return `<section class="msg ${roleClass}"><div class="role">[${role}]</div>${ts}<div class="content">${content}</div></section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:20px;background:#0f172a;color:#e2e8f0}
.wrap{max-width:860px;margin:0 auto}
.h{margin:0 0 4px;font-size:24px}
.url{margin:0 0 18px;font-size:13px;color:#93c5fd;word-break:break-all}
.msg{border:1px solid #1e293b;border-radius:12px;padding:12px;margin:10px 0;background:#111827}
.msg.user{border-color:#0ea5e9}
.msg.assistant{border-color:#475569}
.role{font-weight:700;margin-bottom:6px}
.ts{font-size:12px;color:#94a3b8;margin-bottom:8px}
.content{line-height:1.6;word-break:break-word;white-space:normal}
</style>
</head>
<body><div class="wrap"><h1 class="h">${title}</h1><div class="url">Original URL: ${url}</div>${body}</div></body>
</html>`;
}

function serializeConversation(conversation, format) {
  if (format === 'json') {
    return JSON.stringify({
      ...conversation,
      ...EXPORTER_META,
      exportMeta: {
        tool: 'chatweave-exporter',
        name: 'ChatWeave Conversation Exporter',
        version: EXPORTER_META.exportVersion,
        format: 'json',
        schema: 'chatweave-exporter.v1',
        platform: conversation.platform || state.platform || 'unknown',
        exportedAt: new Date().toISOString()
      }
    }, null, 2);
  }
  if (format === 'md') return toMarkdown(conversation);
  if (format === 'txt') return toText(conversation);
  if (format === 'html') return toHtml(conversation);
  return JSON.stringify(conversation, null, 2);
}

function mimeForFormat(format) {
  if (format === 'json') return 'application/json;charset=utf-8';
  if (format === 'md') return 'text/markdown;charset=utf-8';
  if (format === 'txt') return 'text/plain;charset=utf-8';
  if (format === 'html') return 'text/html;charset=utf-8';
  return 'application/octet-stream';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error(t('errorNoActiveTab'));
  return tab;
}

async function runInjectedExtraction(tabId) {
  const injectedI18n = {
    defaultConversationTitle: t('defaultConversationTitle')
  };

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (i18nData) => {
      const DEFAULT_CONVERSATION_TITLE = String(i18nData && i18nData.defaultConversationTitle || 'Conversation');

      function detectPlatform(hostname, href) {
        const host = String(hostname || '').toLowerCase();
        const url = String(href || '').toLowerCase();
        if (host.includes('chatgpt.com') || host.includes('chat.openai.com') || url.includes('chat.openai.com')) return 'chatgpt';
        if (host.includes('claude.ai')) return 'claude';
        if (host.includes('chat.deepseek.com')) return 'deepseek';
        if (host.includes('chat.qwen.ai')) return 'qwen';
        if (host.includes('grok.com')) return 'grok';
        if (host.includes('gemini.google.com')) return 'gemini';
        if (host.includes('aistudio.google.com')) return 'google-ai-studio';
        if (host.includes('kimi.com')) return 'kimi';
        if (host.includes('chat.mistral.ai')) return 'mistral';
        if (host.includes('copilot.microsoft.com')) return 'copilot';
        if (url.includes('github.com/copilot')) return 'github-copilot';
        if (host.includes('perplexity.ai')) return 'perplexity';
        if (host.includes('poe.com')) return 'poe';
        return 'unknown';
      }

      function normalizeRole(rawRole, hint = '') {
        const role = String(rawRole || '').toLowerCase();
        if (role.includes('assistant') || role.includes('model') || role.includes('ai') || role.includes('bot')) return 'assistant';
        if (role.includes('user') || role.includes('human') || role.includes('me')) return 'user';
        if (role.includes('system')) return 'system';
        if (role.includes('tool')) return 'tool';

        const text = String(hint || '').toLowerCase();
        if (text.includes('assistant') || text.includes('model') || text.includes('bot') || text.includes('claude') || text.includes('gpt') || text.includes('grok')) return 'assistant';
        if (text.includes('user') || text.includes('human') || text.includes('you said') || text.includes('\u4f60\u8bf4')) return 'user';
        return 'assistant';
      }

      function toIsoTimestamp(value, fallbackMs) {
        const fallback = Number.isFinite(fallbackMs) ? fallbackMs : Date.now();
        if (value == null || value === '') return new Date(fallback).toISOString();
        if (typeof value === 'number' && Number.isFinite(value)) {
          const ms = value < 1e12 ? value * 1000 : value;
          return new Date(ms).toISOString();
        }
        if (typeof value === 'object') {
          if (Object.prototype.hasOwnProperty.call(value, '$date')) {
            return toIsoTimestamp(value.$date, fallback);
          }
          if (Object.prototype.hasOwnProperty.call(value, '$numberLong')) {
            return toIsoTimestamp(Number(value.$numberLong), fallback);
          }
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return new Date(fallback).toISOString();
        return date.toISOString();
      }

      function safeStringify(value, maxLength = 15000) {
        if (value == null) return '';
        try {
          const seen = new WeakSet();
          const out = JSON.stringify(value, (key, nested) => {
            if (nested && typeof nested === 'object') {
              if (seen.has(nested)) return '[Circular]';
              seen.add(nested);
            }
            return nested;
          });
          if (!out) return '';
          return out.length > maxLength ? `${out.slice(0, maxLength)}...` : out;
        } catch {
          return String(value);
        }
      }

      function extractTextFromAny(value) {
        if (value == null) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);

        if (Array.isArray(value)) {
          return value.map(item => extractTextFromAny(item)).filter(Boolean).join('\n').trim();
        }

        if (typeof value === 'object') {
          if (typeof value.text === 'string') return value.text;
          if (typeof value.content === 'string') return value.content;
          if (typeof value.markdown === 'string') return value.markdown;
          if (typeof value.value === 'string') return value.value;
          if (typeof value.message === 'string') return value.message;
          if (Array.isArray(value.content)) return extractTextFromAny(value.content);
          if (Array.isArray(value.parts)) return extractTextFromAny(value.parts);

          const type = String(value.type || '').toLowerCase();
          if (type.includes('image')) {
            const url = value.url || value.image_url || value.asset_pointer || value.assetPointer;
            if (url) return `![image](${url})`;
          }
          return safeStringify(value, 8000);
        }

        return String(value);
      }

      function cleanMessageText(rawText, platform, role) {
        let text = String(rawText || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');

        if (platform === 'gemini' && role === 'user') {
          text = text.replace(/^\s*You said\s*/i, '');
          text = text.replace(/^\s*\u4f60\u8bf4(?:\u4e86)?\s*[:：]?\s*/i, '');
        }

        text = text
          .replace(/\n(?:Copy|Edit|Regenerate|Read aloud|Share)\s*$/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        return text;
      }

      function normalizeStructuredMarkersForExport(rawText) {
        let text = String(rawText || '');
        if (!text) return '';

        text = text.replace(/<thinking>([\s\S]*?)<\/thinking>/gi, (_match, body) => {
          const reasoning = String(body || '').trim();
          return reasoning ? `[reasoning]\n${reasoning}\n[/reasoning]` : '';
        });

        text = text.replace(/(?:^|\n)\s*Function:\s*([A-Za-z0-9_.-]+)\(([^)]*)\)\s*(?=\n|$)/g, (_match, fnName, argsText) => {
          const name = String(fnName || 'tool').trim() || 'tool';
          const args = String(argsText || '').trim();
          return args
            ? `\n[tool call] ${name}\n${args}\n[/tool call]\n`
            : `\n[tool call] ${name}\n[/tool call]\n`;
        });

        return text.replace(/\n{3,}/g, '\n\n').trim();
      }

      function simplifyTitle(rawTitle, platform) {
        let title = String(rawTitle || '').trim() || DEFAULT_CONVERSATION_TITLE;
        title = title
          .replace(/\s*-\s*ChatGPT\s*$/i, '')
          .replace(/\s*-\s*Claude\s*$/i, '')
          .replace(/\s*-\s*Grok\s*$/i, '')
          .replace(/\s*-\s*DeepSeek\s*$/i, '')
          .replace(/\s*-\s*Kimi\s*$/i, '')
          .replace(/\s*\u00b7\s*GitHub Copilot\s*$/i, '');

        if (!title) {
          const platformTitle = platform === 'chatgpt'
            ? 'ChatGPT'
            : platform === 'claude'
              ? 'Claude'
              : platform === 'grok'
                ? 'Grok'
                : '';
          return platformTitle ? `${platformTitle} ${DEFAULT_CONVERSATION_TITLE}` : DEFAULT_CONVERSATION_TITLE;
        }
        return title;
      }

      function normalizeMessages(messages, platform) {
        const out = [];
        const seen = new Set();

        (Array.isArray(messages) ? messages : []).forEach((msg, index) => {
          if (!msg || typeof msg !== 'object') return;
          const role = normalizeRole(msg.role, msg.roleHint || '');
          let content = cleanMessageText(msg.content, platform, role);
          content = normalizeStructuredMarkersForExport(content);
          if (!content) return;
          const key = `${role}::${content}`;
          if (seen.has(key)) return;
          seen.add(key);
          const fallbackMs = Date.now() + index * 1000;
          out.push({
            role,
            content,
            timestamp: toIsoTimestamp(msg.timestamp || msg.createdAt || msg.time, fallbackMs)
          });
        });

        return out;
      }

      function queryAllWithShadow(selectors) {
        const results = [];
        const seen = new Set();
        const queue = [document];

        while (queue.length) {
          const root = queue.shift();
          selectors.forEach(selector => {
            root.querySelectorAll(selector).forEach(node => {
              if (!seen.has(node)) {
                seen.add(node);
                results.push(node);
              }
            });
          });
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) queue.push(el.shadowRoot);
          });
        }

        return results;
      }

      function isLikelyComposerText(text, platform) {
        const normalized = String(text || '').trim().toLowerCase();
        if (!normalized) return true;
        if (platform === 'deepseek') {
          return normalized.includes('给 deepseek 发送消息') || normalized === '深度思考' || normalized === '智能搜索';
        }
        if (platform === 'qwen') {
          return normalized.includes('给通义千问发送消息') || normalized.includes('给 qwen 发送消息');
        }
        return false;
      }

      function hasNestedMessageCandidate(node, selectors, platform) {
        return selectors.some(selector => Array.from(node.querySelectorAll(selector)).some(child => {
          if (!child || child === node) return false;
          const rect = child.getBoundingClientRect();
          if (!rect || rect.width < 80 || rect.height < 18) return false;
          const text = cleanMessageText(child.innerText || child.textContent || '', platform, 'assistant');
          return !!text && text.length >= 8;
        }));
      }

      function collectLayoutBasedMessages(platform, selectors) {
        const root = document.querySelector('main') || document.body;
        const allCandidates = queryAllWithShadow(selectors).filter(node => {
          if (!(node instanceof Element)) return false;
          if (!root.contains(node)) return false;
          if (node.closest('header, nav, footer, aside, form, [role=\"dialog\"]')) return false;
          if (node.matches('button, input, textarea, select, label')) return false;
          if (node.getAttribute('contenteditable') === 'true') return false;

          const rect = node.getBoundingClientRect();
          if (!rect || rect.width < 80 || rect.height < 18) return false;

          const text = cleanMessageText(node.innerText || node.textContent || '', platform, 'assistant');
          if (!text || text.length < 2 || text.length > 60000) return false;
          if (isLikelyComposerText(text, platform)) return false;
          return true;
        });

        const pruned = allCandidates.filter(node => !hasNestedMessageCandidate(node, selectors, platform));
        const deduped = [];
        const seen = new Set();

        pruned
          .sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            if (Math.abs(ar.top - br.top) > 8) return ar.top - br.top;
            return ar.left - br.left;
          })
          .forEach(node => {
            const text = cleanMessageText(node.innerText || node.textContent || '', platform, 'assistant');
            const key = text.replace(/\s+/g, ' ').trim();
            if (!key || seen.has(key)) return;
            seen.add(key);

            const rect = node.getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            const explicitRole = node.getAttribute('data-message-author-role') || node.getAttribute('data-role') || '';
            const role = explicitRole
              ? normalizeRole(explicitRole, explicitRole)
              : (centerX > window.innerWidth * 0.58 ? 'user' : 'assistant');

            deduped.push({
              role,
              content: text,
              timestamp: null
            });
          });

        return deduped;
      }

      function collectDomMessages(platform) {
        const messages = [];

        if (platform === 'chatgpt') {
          queryAllWithShadow(['[data-message-author-role]']).forEach(node => {
            const role = normalizeRole(node.getAttribute('data-message-author-role'));
            const text = node.innerText || node.textContent || '';
            messages.push({ role, content: text, timestamp: null });
          });
        }

        if (platform === 'claude') {
          queryAllWithShadow(['[data-testid="user-message"]']).forEach(node => {
            messages.push({ role: 'user', content: node.innerText || node.textContent || '', timestamp: null });
          });
          queryAllWithShadow(['.font-claude-response', '[data-is-streaming] .standard-markdown', '[data-is-streaming] .progressive-markdown']).forEach(node => {
            messages.push({ role: 'assistant', content: node.innerText || node.textContent || '', timestamp: null });
          });
        }

        if (platform === 'grok') {
          queryAllWithShadow(['.message-bubble']).forEach(node => {
            const wrapper = node.closest('[id^="response-"]');
            const wrapperClass = wrapper && typeof wrapper.className === 'string' ? wrapper.className : '';
            const hint = `${wrapperClass} ${node.className || ''}`;
            const role = normalizeRole('', hint);
            messages.push({ role, content: node.innerText || node.textContent || '', timestamp: null, roleHint: hint });
          });
        }

        if (platform === 'deepseek') {
          const deepseekMessages = collectLayoutBasedMessages(platform, [
            'main [class*="markdown"]',
            'main [class*="prose"]',
            'main [class*="message"]',
            'main [class*="bubble"]',
            'main article'
          ]);
          messages.push(...deepseekMessages);
        }

        if (platform === 'qwen') {
          const qwenMessages = collectLayoutBasedMessages(platform, [
            'main [class*="markdown"]',
            'main [class*="prose"]',
            'main [class*="message"]',
            'main [class*="bubble"]',
            'main article'
          ]);
          messages.push(...qwenMessages);
        }

        if (messages.length === 0) {
          const genericSelectors = [
            '[data-message-author-role]',
            '[data-testid*="message"]',
            '[data-role]',
            '.message-bubble',
            '[class*="message"]',
            'article'
          ];

          queryAllWithShadow(genericSelectors).forEach(node => {
            const text = node.innerText || node.textContent || '';
            const normalized = cleanMessageText(text, platform, 'assistant');
            if (!normalized || normalized.length < 2) return;
            if (normalized.length > 30000) return;

            const hint = [
              node.getAttribute('data-message-author-role') || '',
              node.getAttribute('data-role') || '',
              node.getAttribute('data-testid') || '',
              node.getAttribute('aria-label') || '',
              typeof node.className === 'string' ? node.className : ''
            ].join(' ');

            const role = normalizeRole(hint, hint);
            messages.push({ role, content: text, timestamp: null, roleHint: hint });
          });
        }

        return normalizeMessages(messages, platform);
      }

      async function extractChatGPTFromApi() {
        const pathMatch = window.location.pathname.match(/\/c\/([a-z0-9-]+)/i);
        const conversationId = pathMatch ? pathMatch[1] : null;
        if (!conversationId) throw new Error('ChatGPT conversation id not found in URL.');

        let authToken = null;
        try {
          const sessionRes = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
          });
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            if (session && session.accessToken) {
              authToken = `Bearer ${session.accessToken}`;
            }
          }
        } catch {
          // fallback to cookie-auth request without token
        }

        const headers = { Accept: 'application/json' };
        if (authToken) headers.Authorization = authToken;

        const apiRes = await fetch(`/backend-api/conversation/${conversationId}`, {
          method: 'GET',
          credentials: 'include',
          headers
        });

        if (!apiRes.ok) {
          throw new Error(`ChatGPT API ${apiRes.status}`);
        }

        const payload = await apiRes.json();
        if (!payload || typeof payload !== 'object' || !payload.mapping) {
          throw new Error('Unexpected ChatGPT API structure.');
        }

        const branch = [];
        const visited = new Set();
        let cursor = payload.current_node;
        while (cursor && payload.mapping[cursor] && !visited.has(cursor)) {
          visited.add(cursor);
          branch.push(payload.mapping[cursor]);
          cursor = payload.mapping[cursor].parent;
        }
        branch.reverse();

        const messages = [];
        branch.forEach((node, index) => {
          const message = node && node.message && typeof node.message === 'object' ? node.message : null;
          if (!message) return;

          const role = normalizeRole(message.author && message.author.role);
          if (!['user', 'assistant', 'system', 'tool'].includes(role)) return;

          const parts = message.content && Array.isArray(message.content.parts)
            ? message.content.parts
            : [];

          let content = parts.map(part => {
            if (typeof part === 'string') {
              const trimmed = part.trim();
              if (!trimmed) return '';
              if (trimmed[0] === '{' || trimmed[0] === '[') {
                try {
                  return extractTextFromAny(JSON.parse(trimmed));
                } catch {
                  return trimmed;
                }
              }
              return trimmed;
            }
            return extractTextFromAny(part);
          }).filter(Boolean).join('\n').trim();

          if (!content) {
            content = extractTextFromAny(message.content);
          }
          if (!content) return;

          messages.push({
            role,
            content,
            timestamp: toIsoTimestamp(message.create_time || message.update_time, Date.now() + index * 1000)
          });
        });

        const normalized = normalizeMessages(messages, 'chatgpt');
        if (normalized.length === 0) throw new Error('No messages from ChatGPT API.');

        return {
          title: simplifyTitle(payload.title || document.title, 'chatgpt'),
          platform: 'chatgpt',
          timestamp: toIsoTimestamp(payload.create_time, Date.now()),
          url: window.location.href,
          messages: normalized
        };
      }

      function getCookieValue(name) {
        try {
          const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
          return m ? decodeURIComponent(m[1]) : null;
        } catch {
          return null;
        }
      }

      async function extractClaudeFromApi() {
        const conversationIdMatch = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/i);
        const conversationId = conversationIdMatch ? conversationIdMatch[1] : null;
        if (!conversationId) throw new Error('Claude conversation id not found.');

        const orgMatch = window.location.pathname.match(/\/organization\/([a-f0-9-]+)/i);
        const orgId = (orgMatch && orgMatch[1]) || getCookieValue('lastActiveOrg');
        if (!orgId) throw new Error('Claude organization id not found.');

        const headers = {
          Accept: '*/*',
          'Anthropic-Client-Platform': 'web_claude_ai',
          'Anthropic-Client-Version': '1.0.0'
        };
        const anonId = getCookieValue('ajs_anonymous_id');
        if (anonId) headers['Anthropic-Anonymous-Id'] = anonId;
        const deviceId = getCookieValue('anthropic-device-id');
        if (deviceId) headers['Anthropic-Device-Id'] = deviceId;

        const apiPath = `/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual`;
        const res = await fetch(apiPath, {
          method: 'GET',
          credentials: 'include',
          headers
        });
        if (!res.ok) {
          throw new Error(`Claude API ${res.status}`);
        }

        const payload = await res.json();
        const chatMessages = Array.isArray(payload.chat_messages) ? payload.chat_messages : [];
        if (chatMessages.length === 0) throw new Error('No Claude chat_messages.');

        const sorted = chatMessages.slice().sort((a, b) => (a.index || 0) - (b.index || 0));
        const messages = sorted.map((item, index) => {
          const role = normalizeRole(item.sender);
          const blocks = Array.isArray(item.content) ? item.content : [];
          const textParts = [];

          blocks.forEach(block => {
            const blockType = String(block && block.type || '').toLowerCase();
            if (blockType === 'text') {
              textParts.push(String(block.text || ''));
              return;
            }
            if (blockType === 'tool_use') {
              const fnName = String(block.name || 'tool');
              const argsText = safeStringify(block.input || block.arguments || {}, 3000);
              textParts.push(
                argsText
                  ? `[tool call] ${fnName}\n${argsText}\n[/tool call]`
                  : `[tool call] ${fnName}\n[/tool call]`
              );
              return;
            }
            if (blockType === 'tool_result') {
              const toolName = String(
                block.name ||
                block.tool_name ||
                block.toolName ||
                block.tool_use_name ||
                'tool'
              ).trim() || 'tool';
              const toolResult = extractTextFromAny(block.content);
              if (toolResult) {
                textParts.push(`[tool result] ${toolName}\n${toolResult}\n[/tool result]`);
              }
              return;
            }
            if (blockType === 'thinking') {
              const thinking = extractTextFromAny(block.thinking || block.text || block.content);
              if (thinking) textParts.push(`[reasoning]\n${thinking}\n[/reasoning]`);
              return;
            }
            const fallback = extractTextFromAny(block);
            if (fallback) textParts.push(fallback);
          });

          return {
            role,
            content: textParts.join('\n\n').trim(),
            timestamp: toIsoTimestamp(item.created_at, Date.now() + index * 1000)
          };
        });

        const normalized = normalizeMessages(messages, 'claude');
        if (normalized.length === 0) throw new Error('No messages from Claude API.');

        return {
          title: simplifyTitle(payload.name || document.title, 'claude'),
          platform: 'claude',
          timestamp: normalized[0].timestamp,
          url: window.location.href,
          messages: normalized
        };
      }

      async function extractGrokFromApi() {
        const shareMatch = window.location.pathname.match(/\/share\/([^/?#]+)/i);
        const conversationMatch = window.location.pathname.match(/\/c\/([\w-]+)/i);

        let endpoint = null;
        if (shareMatch && shareMatch[1]) {
          endpoint = `/rest/app-chat/share_links/${shareMatch[1]}`;
        } else if (conversationMatch && conversationMatch[1]) {
          endpoint = `/rest/app-chat/conversations/${conversationMatch[1]}/responses`;
        }

        if (!endpoint) throw new Error('Grok conversation id not found.');

        const res = await fetch(endpoint, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          throw new Error(`Grok API ${res.status}`);
        }

        const payload = await res.json();
        let responses = [];
        let title = document.title || DEFAULT_CONVERSATION_TITLE;

        if (Array.isArray(payload)) {
          responses = payload;
        } else if (Array.isArray(payload.responses)) {
          responses = payload.responses;
          if (payload.conversation && payload.conversation.title) {
            title = payload.conversation.title;
          }
        } else if (payload && payload.conversation && Array.isArray(payload.conversation.responses)) {
          responses = payload.conversation.responses;
          if (payload.conversation.title) title = payload.conversation.title;
        } else {
          throw new Error('Unexpected Grok API structure.');
        }

        const messages = responses.map((wrapped, index) => {
          const response = wrapped && typeof wrapped === 'object' && wrapped.response && typeof wrapped.response === 'object'
            ? wrapped.response
            : wrapped;
          const role = normalizeRole(response && (response.sender || response.role));
          const content = extractTextFromAny(response && (response.message || response.content || response.response || response.output));
          return {
            role,
            content,
            timestamp: toIsoTimestamp(
              response && (response.create_time || response.created_at || response.timestamp),
              Date.now() + index * 1000
            )
          };
        });

        const normalized = normalizeMessages(messages, 'grok');
        if (normalized.length === 0) throw new Error('No messages from Grok API.');

        return {
          title: simplifyTitle(title, 'grok'),
          platform: 'grok',
          timestamp: normalized[0].timestamp,
          url: window.location.href,
          messages: normalized
        };
      }

      async function extractConversation() {
        const platform = detectPlatform(window.location.hostname, window.location.href);
        const errors = [];
        let conversation = null;

        if (platform === 'chatgpt') {
          try {
            conversation = await extractChatGPTFromApi();
          } catch (error) {
            errors.push(`chatgpt-api: ${error && error.message ? error.message : error}`);
          }
        }

        if (!conversation && platform === 'claude') {
          try {
            conversation = await extractClaudeFromApi();
          } catch (error) {
            errors.push(`claude-api: ${error && error.message ? error.message : error}`);
          }
        }

        if (!conversation && platform === 'grok') {
          try {
            conversation = await extractGrokFromApi();
          } catch (error) {
            errors.push(`grok-api: ${error && error.message ? error.message : error}`);
          }
        }

        if (!conversation) {
          const domMessages = collectDomMessages(platform);
          if (domMessages.length > 0) {
            conversation = {
              title: simplifyTitle(document.title || DEFAULT_CONVERSATION_TITLE, platform),
              platform,
              timestamp: domMessages[0].timestamp || new Date().toISOString(),
              url: window.location.href,
              messages: domMessages
            };
          }
        }

        if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
          const details = errors.length > 0 ? ` (${errors.join(' | ')})` : '';
          throw new Error(`No conversation messages detected on this page.${details}`);
        }

        return conversation;
      }

      return await extractConversation();
    },
    args: [injectedI18n]
  });

  const first = results && results[0] ? results[0] : null;
  if (!first) {
    throw new Error(t('errorNoResult'));
  }
  if (first.result) {
    return first.result;
  }
  throw new Error(first.error || t('errorExtractionFailed'));
}

async function getConversation(force = false) {
  const tab = await getActiveTab();
  state.tabId = tab.id;
  state.tabUrl = tab.url || '';
  state.platform = detectPlatformFromUrl(state.tabUrl);

  const sameTab = state.cachedConversation && !force && state.cachedAt > 0 && Date.now() - state.cachedAt < 12000;
  if (sameTab) {
    return state.cachedConversation;
  }

  const conversation = await runInjectedExtraction(tab.id);
  state.cachedConversation = conversation;
  state.cachedAt = Date.now();
  state.title = conversation.title || t('defaultConversationTitle');
  return conversation;
}

async function downloadConversation(conversation, format) {
  const ext = format === 'md' ? 'md' : format;
  const serialized = serializeConversation(conversation, format);
  const blob = new Blob([serialized], { type: mimeForFormat(format) });
  const objectUrl = URL.createObjectURL(blob);

  const filename = buildFilename(conversation.platform || state.platform, conversation.title || state.title, ext);

  try {
    await chrome.downloads.download({
      url: objectUrl,
      filename,
      saveAs: true
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }
}

async function initPopup() {
  try {
    const tab = await getActiveTab();
    state.tabId = tab.id;
    state.tabUrl = tab.url || '';
    state.platform = detectPlatformFromUrl(state.tabUrl);
    const support = isSupportedUrl(state.tabUrl);

    const host = (() => {
      try { return new URL(state.tabUrl).host; } catch { return state.tabUrl || 'unknown'; }
    })();

    setMetaText(t('metaPlatformPage', [prettyPlatform(state.platform), host]));

    if (!support) {
      setButtonsDisabled(true);
      setStatus(t('statusUnsupportedPage'), 'error');
      return;
    }

    setButtonsDisabled(false);
    setStatus(t('statusReady'));
  } catch (error) {
    console.error('initPopup failed:', error);
    setButtonsDisabled(true);
    setMetaText(t('metaNoTab'));
    setStatus(t('statusInitFailed'), 'error');
  }
}

document.getElementById('copyMarkdown').addEventListener('click', async () => {
  try {
    setStatus(t('statusExtracting'));
    const conversation = await getConversation(true);
    const markdown = toMarkdown(conversation);
    await navigator.clipboard.writeText(markdown);
    setStatus(t('statusCopySuccess', [String(conversation.messages.length)]), 'ok');
  } catch (error) {
    console.error('copy markdown failed:', error);
    setStatus(t('statusCopyFailed'), 'error');
  }
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const format = document.getElementById('formatSelect').value || 'json';
  try {
    setStatus(t('statusExtracting'));
    const conversation = await getConversation(true);
    await downloadConversation(conversation, format);
    setStatus(t('statusDownloadStarted', [format.toUpperCase(), String(conversation.messages.length)]), 'ok');
  } catch (error) {
    console.error('download failed:', error);
    setStatus(t('statusDownloadFailed'), 'error');
  }
});

initFormatPicker();
applyI18n();
initPopup();
