const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const versionFile = path.join(rootDir, 'chatweave-version.json');

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assertVersion(version) {
  if (!VERSION_PATTERN.test(String(version || '').trim())) {
    throw new Error(`Invalid version: ${version}`);
  }
}

function toExtensionManifestVersion(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error(`Invalid version: ${version}`);

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const pre = String(match[4] || '').trim();

  // Chromium extension manifest only accepts numbers and dots.
  if (!pre) return `${major}.${minor}.${patch}`;

  let build = 0;
  const numbered = pre.match(/(?:beta|pre|rc)\.(\d+)/i) || pre.match(/(\d+)/);
  if (numbered) {
    build = Number(numbered[1]) || 0;
  }
  return `${major}.${minor}.${patch}.${build}`;
}

function replaceOrThrow(content, pattern, replacement, description, filePath) {
  if (!pattern.test(content)) {
    throw new Error(`Pattern not found for ${description} in ${filePath}`);
  }
  return content.replace(pattern, replacement);
}

function syncTextFile(filePath, replacers) {
  const absolutePath = path.join(rootDir, filePath);
  let content = readText(absolutePath);
  const original = content;

  replacers.forEach((item) => {
    content = replaceOrThrow(content, item.pattern, item.replacement, item.description, filePath);
  });

  if (content !== original) {
    writeText(absolutePath, content);
    return true;
  }
  return false;
}

function ensureManifestVersionName(content, versionName) {
  if (/"version_name"\s*:/.test(content)) {
    return content.replace(/("version_name"\s*:\s*")([^"]+)(")/, `$1${versionName}$3`);
  }
  return content.replace(/("version"\s*:\s*"[^"]+",)/, `$1\n  "version_name": "${versionName}",`);
}

function main() {
  const nextVersion = process.argv[2] ? String(process.argv[2]).trim() : '';
  let versionState = readJson(versionFile);

  if (nextVersion) {
    assertVersion(nextVersion);
    versionState.version = nextVersion;
    writeJson(versionFile, versionState);
  }

  const version = String(versionState.version || '').trim();
  assertVersion(version);
  const extensionManifestVersion = toExtensionManifestVersion(version);

  const changedFiles = [];

  const indexChanged = syncTextFile('index.html', [
    {
      description: 'HTML subtitle',
      pattern: /(<p class="subtitle" id="appSubtitle">[^<]*v)([0-9A-Za-z.-]+)(<\/p>)/,
      replacement: `$1${version}$3`
    },
    {
      description: 'i18n app subtitle',
      pattern: /('app\.subtitle': '[^']*?v)([0-9A-Za-z.-]+)(',)/g,
      replacement: `$1${version}$3`
    },
    {
      description: 'EN about subtitle',
      pattern: /(Unified Conversation Workspace v)([0-9A-Za-z.-]+)/g,
      replacement: `$1${version}`
    },
    {
      description: 'ZH about subtitle',
      pattern: /(对话迁移助手 v)([0-9A-Za-z.-]+)/g,
      replacement: `$1${version}`
    }
  ]);
  if (indexChanged) changedFiles.push('index.html');

  const manifestPath = path.join(rootDir, 'edge_exporter_lite', 'manifest.json');
  let manifestContent = readText(manifestPath);
  const originalManifest = manifestContent;
  manifestContent = replaceOrThrow(
    manifestContent,
    /("version"\s*:\s*")([^"]+)(")/,
    `$1${extensionManifestVersion}$3`,
    'extension manifest version',
    'edge_exporter_lite/manifest.json'
  );
  manifestContent = ensureManifestVersionName(manifestContent, version);
  if (manifestContent !== originalManifest) {
    writeText(manifestPath, manifestContent);
    changedFiles.push(path.join('edge_exporter_lite', 'manifest.json'));
  }

  const popupChanged = syncTextFile(path.join('edge_exporter_lite', 'popup.js'), [
    {
      description: 'exporter meta version',
      pattern: /(exportVersion:\s*')([^']+)(',)/,
      replacement: `$1${version}$3`
    }
  ]);
  if (popupChanged) changedFiles.push(path.join('edge_exporter_lite', 'popup.js'));

  console.log(`Synced ChatWeave version: ${version}`);
  console.log(`Manifest version (numeric): ${extensionManifestVersion}`);
  if (changedFiles.length === 0) {
    console.log('No files changed.');
    return;
  }
  console.log('Updated files:');
  changedFiles.forEach((file) => console.log(`- ${file}`));
}

main();
