#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION & MAGIC CONSTANTS
// ============================================================================

const DOCS_DIR = 'docs/engineering';
const REGISTRY_FILE = path.join(DOCS_DIR, 'DOCUMENT-REGISTRY.md');

// Indexing configuration
const INDEXING_CONFIG = {
  enabled: true,
  summary_mode: 'skip', // 'error' or 'skip'
  min_level: 2,
  max_level: 3,
  subsection_token_threshold: 300, // Skip subsections if parent section < this many tokens
};

// Token estimation (word count × multiplier)
const TOKEN_ESTIMATE_MULTIPLIER = 1.3;

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

const FOLDER_ORDER = ['ideation', 'requirements', 'specifications', 'plans', 'meta'];

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

/**
 * Sort documents deterministically:
 * 1. folder order (ideation → requirements → specifications → plans → meta)
 * 2. area
 * 3. feature
 * 4. filename
 */
function sortDocs(docs) {
  return docs.sort((a, b) => {
    const folderOrderA = FOLDER_ORDER.indexOf(a.type);
    const folderOrderB = FOLDER_ORDER.indexOf(b.type);
    if (folderOrderA !== folderOrderB) return folderOrderA - folderOrderB;

    const areaA = a.frontmatter?.area || '';
    const areaB = b.frontmatter?.area || '';
    if (areaA !== areaB) return areaA.localeCompare(areaB);

    const featureA = a.frontmatter?.feature || '';
    const featureB = b.frontmatter?.feature || '';
    if (featureA !== featureB) return featureA.localeCompare(featureB);

    return a.file.localeCompare(b.file);
  });
}

/**
 * Parse YAML frontmatter (simple parser, not full YAML spec).
 * Handles:
 * - key: value
 * - key: [a, b, c]
 * - key: 'multiline flow scalar'
 * - key:\n  'value on next line'  (indented continuation)
 * - key: | (block scalar)
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  const lines = yaml.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');

    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let value = line.substring(colonIdx + 1).trim();

      // If value is empty and next line is indented, it's the actual value
      if (value === '' && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        if (nextLine.match(/^\s/)) {
          i++;
          value = nextLine.trim();
        }
      }

      // Handle multiline flow scalars (quoted strings spanning lines)
      if (
        (value.startsWith("'") && !value.endsWith("'")) ||
        (value.startsWith('"') && !value.endsWith('"'))
      ) {
        const quote = value[0];
        // Accumulate lines until closing quote
        while (i < lines.length - 1) {
          i++;
          const nextLine = lines[i];
          value += ' ' + nextLine.trim();
          if (nextLine.trim().endsWith(quote)) break;
        }
        // Remove quotes
        value = value.slice(1, value.lastIndexOf(quote));
      }

      // Handle arrays [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        result[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim());
      }
      // Handle block scalars (| or >)
      else if (value === '|' || value === '>') {
        // Block scalar: consume next non-empty line
        if (i < lines.length - 1) {
          i++;
          value = lines[i].trim();
        }
        result[key] = value;
      } else if (value) {
        result[key] = value;
      }
    }

    i++;
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

/**
 * Improved link validation:
 * - Handles relative paths (foo.md, foo/bar.md)
 * - Handles root paths (/docs/...)
 * - Handles relative with ./
 * - Treats common schemes as valid (mailto:, tel:, etc.)
 */
function linkExists(url, docDir) {
  // External URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  // mailto, tel, etc.
  if (url.includes(':') && !url.includes('/')) {
    return true;
  }

  // Anchor-only links
  if (url.startsWith('#')) {
    return true;
  }

  // Fragment links (e.g., foo.md#section)
  if (url.includes('#')) {
    const [docRef] = url.split('#');
    if (docRef === '') return true; // #anchor-only

    // Check if docRef exists
    let filePath;
    if (docRef.startsWith('/')) {
      filePath = path.join(process.cwd(), docRef);
    } else if (docRef.startsWith('.')) {
      filePath = path.resolve(docDir, docRef);
    } else {
      // Relative (no prefix): resolve from docDir
      filePath = path.join(docDir, docRef);
    }
    return fs.existsSync(filePath);
  }

  // Non-fragment links
  let filePath;
  if (url.startsWith('/')) {
    filePath = path.join(process.cwd(), url);
  } else if (url.startsWith('.')) {
    filePath = path.resolve(docDir, url);
  } else {
    // Relative (no prefix): resolve from docDir
    filePath = path.join(docDir, url);
  }

  return fs.existsSync(filePath);
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
  const now = new Date().toISOString();

  const updatedContent = doc.content.replace(
    /last_updated: \d{4}-\d{2}-\d{2}(?:T[\d:\.Z]+)?/,
    `last_updated: ${now}`,
  );

  if (updatedContent !== doc.content) {
    fs.writeFileSync(doc.path, updatedContent, 'utf-8');
    return true;
  }
  return false;
}

/**
 * Format files with Prettier.
 * Patch 3: Stop swallowing Prettier errors.
 */
function formatFiles(filePaths) {
  if (filePaths.length === 0) return;

  try {
    execSync(`prettier ${filePaths.map((f) => `"${f}"`).join(' ')} --write`, {
      encoding: 'utf-8',
    });
  } catch (err) {
    console.error('❌ Prettier formatting failed:');
    console.error(err.stderr || err.message);
    throw err;
  }
}

function getExistingFrontmatter() {
  if (!fs.existsSync(REGISTRY_FILE)) return null;

  const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[0] : null;
}

/**
 * Patch 0: Use sorted docs for deterministic generation.
 * Patch 4: Sort docs before generation.
 */
function updateRegistry(allDocs) {
  const todayDate = new Date().toISOString().split('T')[0];
  const sortedDocs = sortDocs(allDocs);

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

  for (const doc of sortedDocs) {
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

/**
 * Patch 0: Use sorted docs for deterministic generation.
 * Patch 4: Sort docs before generation.
 */
function updateFolderReadme(type, allDocs) {
  const folderName = DOC_FOLDERS[type];
  const readmePath = path.join(DOCS_DIR, folderName, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf-8');
  const sortedDocs = sortDocs(allDocs);

  const docsOfType = sortedDocs.filter(
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

/**
 * Slugify a title to create a section ID.
 * Example: "Document Relationships" → "document_relationships"
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
    .replace(/_+/g, '_');
}

/**
 * Estimate tokens in text (word count * 1.3).
 */
function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * TOKEN_ESTIMATE_MULTIPLIER);
}

/**
 * Extract sections from markdown content.
 * Returns array of section objects with H2/H3 hierarchy.
 */
function extractSections(content, errors, docRelativePath) {
  const lines = content.split('\n');
  const sections = [];
  const stack = []; // Track nesting: [{level, section}]

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);

    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const title = headingMatch[2];

    if (level < INDEXING_CONFIG.min_level || level > INDEXING_CONFIG.max_level) continue;

    // Pop stack to correct level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    // Extract summary (next non-empty line should be "Summary: ...")
    let summary = null;
    let summaryLineNum = lineNum + 1;
    while (summaryLineNum < lines.length && !lines[summaryLineNum].trim()) {
      summaryLineNum++;
    }

    if (summaryLineNum < lines.length) {
      const summaryLine = lines[summaryLineNum];
      if (summaryLine.startsWith('Summary:')) {
        summary = summaryLine.replace(/^Summary:\s*/, '').trim();
      } else if (INDEXING_CONFIG.summary_mode === 'error') {
        errors.push(
          `${docRelativePath}: Missing summary after heading "${title}" (line ${lineNum + 1})`,
        );
        continue;
      }
    } else if (INDEXING_CONFIG.summary_mode === 'error') {
      errors.push(
        `${docRelativePath}: Missing summary after heading "${title}" (line ${lineNum + 1})`,
      );
      continue;
    }

    // Find end line (next heading of same or higher level, or EOF)
    let endLine = lines.length - 1;
    for (let i = lineNum + 1; i < lines.length; i++) {
      const nextHeading = lines[i].match(/^(#{2,3})\s+(.+)$/);
      if (nextHeading && nextHeading[1].length <= level) {
        endLine = i - 1;
        break;
      }
    }

    // Get section content for token estimation
    const sectionContent = lines.slice(lineNum, endLine + 1).join('\n');
    const tokenEst = estimateTokens(sectionContent);

    const section = {
      id: slugify(title),
      title,
      lines: [lineNum + 1, endLine + 1], // 1-based
      summary,
      token_est: tokenEst,
      subsections: [],
    };

    if (level === 2) {
      sections.push(section);
      stack.push({ level, section });
    } else if (level === 3 && stack.length > 0) {
      stack[stack.length - 1].section.subsections.push(section);
      stack.push({ level, section });
    }
  }

  return sections;
}

/**
 * Embed section index in document frontmatter.
 */
function embedSectionIndex(doc) {
  const frontmatterMatch = doc.content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return; // No frontmatter, skip

  let frontmatterYaml = frontmatterMatch[1];
  const contentAfterFrontmatter = doc.content.substring(frontmatterMatch[0].length);

  // Remove any existing index from frontmatter to get clean base
  const cleanFrontmatterYaml = frontmatterYaml.replace(/\s+(generated_at|index):[\s\S]*$/m, '');

  // Extract sections fresh from the raw content (after removing frontmatter)
  const errors = [];
  let sections = extractSections(contentAfterFrontmatter, errors, doc.relativePath);
  if (errors.length > 0 || sections.length === 0) return; // Error or no sections, skip

  // Update last_updated with full ISO timestamp
  const now = new Date().toISOString();
  frontmatterYaml = frontmatterYaml.replace(
    /last_updated: \d{4}-\d{2}-\d{2}(?:T[\d:\.Z]+)?/,
    `last_updated: ${now}`,
  );

  // Ensure frontmatter_auto_updated_by fields exist
  if (!frontmatterYaml.includes('frontmatter_auto_updated_by:')) {
    // Insert after feature field (or area if feature doesn't exist)
    const featureMatch = frontmatterYaml.match(/(feature:.*\n)/);
    const insertAfter = featureMatch ? featureMatch[1] : frontmatterYaml.match(/(area:.*\n)/)[1];
    const insertPosition = frontmatterYaml.indexOf(insertAfter) + insertAfter.length;

    frontmatterYaml =
      frontmatterYaml.substring(0, insertPosition) +
      'frontmatter_auto_updated_by: script/validate-docs.mjs\n' +
      'frontmatter_auto_updated_on_every: git commit (pre-commit hook)\n' +
      frontmatterYaml.substring(insertPosition);
  }

  // Build index YAML (with placeholder line numbers; will offset after measuring)
  let indexYaml = `
index:
  sections:`;

  for (const section of sections) {
    indexYaml += `
    - id: ${section.id}
      title: "${section.title}"
      lines: [${section.lines[0]}, ${section.lines[1]}]`;

    if (section.summary) {
      indexYaml += `\n      summary: "${section.summary.replace(/"/g, '\\"')}"`;
    }

    indexYaml += `\n      token_est: ${section.token_est}`;

    // Only include subsections if parent section exceeds token threshold
    if (
      section.subsections &&
      section.subsections.length > 0 &&
      section.token_est >= INDEXING_CONFIG.subsection_token_threshold
    ) {
      indexYaml += '\n      subsections:';
      for (const sub of section.subsections) {
        indexYaml += `
        - id: ${sub.id}
          title: "${sub.title}"
          lines: [${sub.lines[0]}, ${sub.lines[1]}]`;

        if (sub.summary) {
          indexYaml += `\n          summary: "${sub.summary.replace(/"/g, '\\"')}"`;
        }

        indexYaml += `\n          token_est: ${sub.token_est}`;
      }
    }
  }

  // Build a skeleton index first to measure its size
  let skeletonIndexYaml = `
index:
  sections:`;

  for (const section of sections) {
    skeletonIndexYaml += `
    - id: ${section.id}
      title: "${section.title}"
      lines: [0, 0]`;

    if (section.summary) {
      skeletonIndexYaml += `\n      summary: "${section.summary.replace(/"/g, '\\"')}"`;
    }

    skeletonIndexYaml += `\n      token_est: ${section.token_est}`;

    // Only include subsections if parent section exceeds token threshold
    if (
      section.subsections &&
      section.subsections.length > 0 &&
      section.token_est >= INDEXING_CONFIG.subsection_token_threshold
    ) {
      skeletonIndexYaml += '\n      subsections:';
      for (const sub of section.subsections) {
        skeletonIndexYaml += `
        - id: ${sub.id}
          title: "${sub.title}"
          lines: [0, 0]`;

        if (sub.summary) {
          skeletonIndexYaml += `\n          summary: "${sub.summary.replace(/"/g, '\\"')}"`;
        }

        skeletonIndexYaml += `\n          token_est: ${sub.token_est}`;
      }
    }
  }

  // Create temporary document to measure frontmatter + index size (up to closing ---)
  const tempFrontmatter = `---
${cleanFrontmatterYaml}${skeletonIndexYaml}
---`;
  // Count lines: the closing --- is on line N, so content starts on line N+1
  const allLines = tempFrontmatter.split('\n');
  const closingDashIndex = allLines.indexOf('---', 1); // Array index of closing ---
  const indexLineOffset = closingDashIndex; // Number of lines before the content block (used as offset)

  console.log(`[DEBUG] ${doc.relativePath}:`);
  console.log(`  tempFrontmatter has ${allLines.length} lines`);
  console.log(`  closing --- at array index ${closingDashIndex}`);
  console.log(`  indexLineOffset = ${indexLineOffset}`);
  console.log(
    `  Section before offset: ${sections[0]?.id} at [${sections[0]?.lines[0]}, ${sections[0]?.lines[1]}]`,
  );
  console.log(
    `  Section after offset: ${sections[0]?.id} at [${sections[0]?.lines[0] + indexLineOffset}, ${sections[0]?.lines[1] + indexLineOffset}]`,
  );

  // Now build the final index with correct line numbers (offset the extracted ones)
  let finalIndexYaml = `
index:
  sections:`;

  for (const section of sections) {
    finalIndexYaml += `
    - id: ${section.id}
      title: "${section.title}"
      lines: [${section.lines[0] + indexLineOffset}, ${section.lines[1] + indexLineOffset}]`;

    if (section.summary) {
      finalIndexYaml += `\n      summary: "${section.summary.replace(/"/g, '\\"')}"`;
    }

    finalIndexYaml += `\n      token_est: ${section.token_est}`;

    // Only include subsections if parent section exceeds token threshold
    if (
      section.subsections &&
      section.subsections.length > 0 &&
      section.token_est >= INDEXING_CONFIG.subsection_token_threshold
    ) {
      finalIndexYaml += '\n      subsections:';
      for (const sub of section.subsections) {
        finalIndexYaml += `
        - id: ${sub.id}
          title: "${sub.title}"
          lines: [${sub.lines[0] + indexLineOffset}, ${sub.lines[1] + indexLineOffset}]`;

        if (sub.summary) {
          finalIndexYaml += `\n          summary: "${sub.summary.replace(/"/g, '\\"')}"`;
        }

        finalIndexYaml += `\n          token_est: ${sub.token_est}`;
      }
    }
  }

  // Use clean frontmatter for embedding
  frontmatterYaml = cleanFrontmatterYaml;

  // Combine frontmatter + index + content
  const newFrontmatter = `---
${frontmatterYaml}${finalIndexYaml}
---`;

  const newContent = newFrontmatter + contentAfterFrontmatter;

  // Only write if changed (avoid unnecessary git churn)
  if (newContent !== doc.content) {
    fs.writeFileSync(doc.path, newContent, 'utf-8');
    return true; // Indicate doc was modified
  }
  return false;
}

/**
 * Patch 1: Re-stage modified files so they are included in the commit.
 */
function restageModifiedFiles(filePaths) {
  if (filePaths.length === 0) return;

  try {
    execSync(`git add ${filePaths.map((f) => `"${f}"`).join(' ')}`, {
      stdio: 'pipe',
    });
  } catch (err) {
    console.error('❌ Failed to re-stage files:');
    console.error(err.message);
    throw err;
  }
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
    // PATCH 0: Re-read docs after updating last_updated (fixes stale data)
    const updatedDocs = getAllDocFiles();

    for (const doc of updatedDocs) {
      validateFrontmatter(doc, errors);
      validateNaming(doc, errors);
      validateLinks(doc, errors);
    }

    if (errors.length === 0) {
      try {
        // PATCH 0: Use updatedDocs instead of allDocs for generation
        updateRegistry(updatedDocs);
        fixes.push('✅ Updated DOCUMENT-REGISTRY.md');

        for (const type of Object.keys(DOC_FOLDERS)) {
          updateFolderReadme(type, updatedDocs);
        }
        fixes.push('✅ Updated folder READMEs');

        // Generate section indices (embedded in frontmatter)
        if (INDEXING_CONFIG.enabled) {
          let indexedCount = 0;
          for (const doc of updatedDocs) {
            if (embedSectionIndex(doc)) {
              indexedCount++;
            }
          }
          if (indexedCount > 0) {
            fixes.push(`✅ Embedded section indices in ${indexedCount} documents`);
          }
        }

        // PATCH 1: Re-stage generated files
        const filesToRestage = [
          REGISTRY_FILE,
          ...Object.values(DOC_FOLDERS).map((folderName) =>
            path.join(DOCS_DIR, folderName, 'README.md'),
          ),
          ...updatedDocPaths,
        ];
        restageModifiedFiles(filesToRestage);
      } catch (e) {
        errors.push(`Failed to update registry, indices, or re-stage files: ${e.message}`);
      }
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
