#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DOCS_DIR = 'docs/engineering';
const REGISTRY_FILE = path.join(DOCS_DIR, 'DOCUMENT-REGISTRY.md');

const DOC_FOLDERS = {
  ideation: '00-ideation',
  requirements: '01-requirements',
  specifications: '02-specifications',
  plans: '03-implementation-plans',
  meta: 'meta',
};

const DOC_TYPES = {
  ideation: 'IDEATION',
  requirements: 'REQ',
  specifications: 'SPEC',
  plans: 'IMPL-PLAN',
  meta: 'META',
};

const REQUIRED_FRONTMATTER_FIELDS = [
  'type',
  'status',
  'stability',
  'created',
  'last_updated',
  'area',
  'feature',
  'summary_short',
  'summary_long',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        result[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim());
      } else {
        result[key] = value;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function getAllDocFiles() {
  const docs = [];
  for (const [type, folderName] of Object.entries(DOC_FOLDERS)) {
    const folderPath = path.join(DOCS_DIR, folderName);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.md') && f !== 'README.md');
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      docs.push({
        type,
        folderName,
        file,
        path: filePath,
        content,
        frontmatter,
        relativePath: path.join(folderName, file),
      });
    }
  }

  return docs;
}

function getChangedDocFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR docs/engineering/', {
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .filter(
        (f) => f.endsWith('.md') && !f.includes('README.md') && !f.includes('DOCUMENT-REGISTRY.md'),
      );
  } catch {
    return [];
  }
}

function validateFrontmatter(doc, errors) {
  if (!doc.frontmatter) {
    errors.push(`${doc.relativePath}: Missing YAML frontmatter`);
    return false;
  }

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!doc.frontmatter[field]) {
      errors.push(`${doc.relativePath}: Missing frontmatter field: ${field}`);
    }
  }

  if (doc.frontmatter.type && doc.frontmatter.type !== DOC_TYPES[doc.type]) {
    errors.push(
      `${doc.relativePath}: type="${doc.frontmatter.type}" doesn't match folder (expected ${DOC_TYPES[doc.type]})`,
    );
  }

  return Object.keys(doc.frontmatter || {}).length > 0;
}

function validateNaming(doc, errors) {
  const prefix = DOC_TYPES[doc.type];
  if (doc.type !== 'meta' && !doc.file.startsWith(prefix + '-')) {
    errors.push(
      `${doc.relativePath}: Should start with "${prefix}-" (e.g., "${prefix}-my-feature.md")`,
    );
  }
}

function extractLinksFromContent(content) {
  const links = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    });
  }

  return links;
}

function linkExists(url, docDir) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  if (url.includes('#') && !url.startsWith('#')) {
    const [docRef] = url.split('#');
    if (docRef.includes('/')) {
      const filePath = path.join(docDir, docRef);
      return fs.existsSync(filePath);
    } else {
      return true;
    }
  }

  if (url.startsWith('.')) {
    const filePath = path.resolve(docDir, url);
    return fs.existsSync(filePath);
  }

  if (url.startsWith('/')) {
    const filePath = path.join(process.cwd(), url);
    return fs.existsSync(filePath);
  }

  return true;
}

function validateLinks(doc, errors) {
  const links = extractLinksFromContent(doc.content);
  const docDir = path.dirname(doc.path);

  for (const link of links) {
    if (!linkExists(link.url, docDir)) {
      errors.push(
        `${doc.relativePath}: Broken link "[${link.text}](${link.url})" - file not found`,
      );
    }
  }
}

function updateLastUpdated(doc) {
  const todayDate = new Date().toISOString().split('T')[0];

  const updatedContent = doc.content.replace(
    /last_updated: \d{4}-\d{2}-\d{2}/,
    `last_updated: ${todayDate}`,
  );

  if (updatedContent !== doc.content) {
    fs.writeFileSync(doc.path, updatedContent, 'utf-8');
    return true;
  }
  return false;
}

function formatFiles(filePaths) {
  if (filePaths.length === 0) return;

  try {
    execSync(`prettier ${filePaths.map((f) => `"${f}"`).join(' ')} --write`, {
      stdio: 'pipe',
    });
  } catch {
    // Prettier errors are non-critical
  }
}

function getExistingFrontmatter() {
  if (!fs.existsSync(REGISTRY_FILE)) return null;

  const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[0] : null;
}

function updateRegistry(allDocs) {
  const todayDate = new Date().toISOString().split('T')[0];

  let frontmatter = getExistingFrontmatter();
  if (!frontmatter) {
    frontmatter = `---
type: REGISTRY
status: system
stability: stable
auto_generated: true
auto_generated_by: script/validate-docs.mjs
auto_generated_on_every: git commit (pre-commit hook)
last_updated: ${todayDate}
do_not_edit_manually: true
---`;
  } else {
    frontmatter = frontmatter.replace(
      /last_updated: \d{4}-\d{2}-\d{2}/,
      `last_updated: ${todayDate}`,
    );
  }

  let registry = `${frontmatter}

Auto-generated – do not edit manually. Update document YAML frontmatter to change entries. See docs/engineering/meta/META-documentation-system.md for details.

## Quick Query

\`\`\`
grep "| SPEC.*active" below
\`\`\`

## Documents

| ID | Type | Status | Stability | Area | Feature | Summary |
|----|------|--------|-----------|------|---------|---------|
`;

  for (const doc of allDocs) {
    const id = doc.file.replace('.md', '');
    const type = doc.frontmatter?.type || DOC_TYPES[doc.type] || '?';
    const status = doc.frontmatter?.status || '?';
    const stability = doc.frontmatter?.stability || '?';
    const area = doc.frontmatter?.area || '?';
    const feature = doc.frontmatter?.feature || '?';
    const summary = doc.frontmatter?.summary_short || '?';
    registry += `| \`${id}\` | ${type} | ${status} | ${stability} | ${area} | ${feature} | ${summary} |\n`;
  }

  registry += `\n_Auto-generated: ${todayDate}_\n`;

  fs.writeFileSync(REGISTRY_FILE, registry, 'utf-8');
}

function updateFolderReadme(type, allDocs) {
  const folderName = DOC_FOLDERS[type];
  const readmePath = path.join(DOCS_DIR, folderName, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf-8');

  const docsOfType = allDocs.filter(
    (d) => d.type === type && d.frontmatter?.status !== 'deprecated',
  );
  const activeDocsOfType = docsOfType.filter((d) => d.frontmatter?.status === 'active');
  const archivedDocsOfType = docsOfType.filter((d) => d.frontmatter?.status !== 'active');

  let activeList =
    activeDocsOfType.length > 0
      ? activeDocsOfType
          .map(
            (d) =>
              `- [\`${d.file.replace('.md', '')}\`](${d.file}) (${d.frontmatter?.feature || '?'})`,
          )
          .join('\n')
      : '(None yet)';

  content = content.replace(
    /## Active (Ideation|Requirements|Specifications|Plans|Meta Documents)\n\n[\s\S]*?\n\n## (Archived|Archived \/ Deprecated|Archived \/ Completed)/,
    `## Active $1\n\n${activeList}\n\n## $2`,
  );

  let archivedList =
    archivedDocsOfType.length > 0
      ? archivedDocsOfType
          .map(
            (d) =>
              `- [\`${d.file.replace('.md', '')}\`](${d.file}) (${d.frontmatter?.status || '?'}) - ${d.frontmatter?.feature || '?'}`,
          )
          .join('\n')
      : '(None yet)';

  content = content.replace(
    /(## Archived[\s\S]*?)\n\n([\s\S]*?)\n\n---/,
    `$1\n\n${archivedList}\n\n---`,
  );

  fs.writeFileSync(readmePath, content, 'utf-8');
}

function main() {
  const errors = [];
  const fixes = [];

  console.log('\n📋 Validating documentation...\n');

  const allDocs = getAllDocFiles();
  const changedFiles = getChangedDocFiles();

  // Auto-update last_updated for changed documents
  const changedDocsMap = new Set(changedFiles.map((f) => f.replace('docs/engineering/', '')));
  const updatedDocPaths = [];
  for (const doc of allDocs) {
    const normalizedPath = doc.relativePath.replace(/\\/g, '/');
    if (changedDocsMap.has(normalizedPath)) {
      if (updateLastUpdated(doc)) {
        updatedDocPaths.push(doc.path);
        fixes.push(`✅ Updated last_updated in ${doc.relativePath}`);
      }
    }
  }
  if (updatedDocPaths.length > 0) {
    formatFiles(updatedDocPaths);
  }

  if (allDocs.length > 0) {
    // Re-read docs after updating last_updated
    const updatedDocs = getAllDocFiles();

    for (const doc of updatedDocs) {
      validateFrontmatter(doc, errors);
      validateNaming(doc, errors);
      validateLinks(doc, errors);
    }
  }

  if (errors.length === 0) {
    try {
      updateRegistry(allDocs);
      fixes.push('✅ Updated DOCUMENT-REGISTRY.md');

      for (const type of Object.keys(DOC_FOLDERS)) {
        updateFolderReadme(type, allDocs);
      }
      fixes.push('✅ Updated folder READMEs');
    } catch (e) {
      errors.push(`Failed to update registry: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    console.log('❌ VALIDATION ERRORS:\n');
    for (const error of errors) {
      console.log(`  ${error}`);
    }
    console.log('\n⚠️  Please fix errors above before committing.\n');
    process.exit(1);
  }

  if (fixes.length > 0) {
    console.log('✨ AUTO-FIXES APPLIED:\n');
    for (const fix of fixes) {
      console.log(`  ${fix}`);
    }
  }

  console.log('\n✅ Documentation validation passed!\n');
}

main();
