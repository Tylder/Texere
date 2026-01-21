#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Automated documentation validation and sync script
 *
 * Detects changes to documentation and:
 * 1. Auto-fixes: Updates DOCUMENT-REGISTRY.md and folder READMEs
 * 2. Validates: YAML frontmatter, naming, cross-references
 * 3. Reports: What was changed or what needs manual fixes
 */

const DOCS_DIR = 'docs/engineering';
const REGISTRY_FILE = path.join(DOCS_DIR, 'DOCUMENT-REGISTRY.md');

const DOC_FOLDERS = {
  ideation: '00-ideation',
  requirements: '01-requirements',
  specifications: '02-specifications',
  plans: '03-implementation-plans',
};

const DOC_TYPES = {
  ideation: 'IDEATION',
  requirements: 'REQ',
  specifications: 'SPEC',
  plans: 'IMPL-PLAN',
};

const REQUIRED_FRONTMATTER_FIELDS = [
  'type',
  'status',
  'stability',
  'created',
  'last_updated',
  'area',
  'feature',
];

/**
 * Parse YAML frontmatter from markdown file
 */
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

/**
 * Get all documentation files
 */
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

/**
 * Get changed files from git
 */
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

/**
 * Validate document frontmatter
 */
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

/**
 * Validate naming convention
 */
function validateNaming(doc, errors) {
  const prefix = DOC_TYPES[doc.type];
  if (!doc.file.startsWith(prefix + '-')) {
    errors.push(
      `${doc.relativePath}: Should start with "${prefix}-" (e.g., "${prefix}-my-feature.md")`,
    );
  }
}

/**
 * Validate cross-references
 */
function validateCrossReferences(doc, allDocs, errors) {
  const {
    implements: implRefs = [],
    coordinates = [],
    covers = [],
    depends_on = [],
  } = doc.frontmatter || {};

  const validateRef = (ref, allowedTypes) => {
    const [docId] = ref.split('#');
    const matching = allDocs.find((d) => d.file.replace('.md', '') === docId);
    if (!matching) {
      errors.push(`${doc.relativePath}: References non-existent document "${docId}"`);
      return;
    }
    if (allowedTypes && !allowedTypes.includes(matching.type)) {
      errors.push(
        `${doc.relativePath}: References ${docId} (${matching.type}), expected ${allowedTypes.join(' or ')}`,
      );
    }
  };

  for (const ref of implRefs) validateRef(ref, ['requirements']);
  for (const ref of covers) validateRef(ref, ['requirements']);
  for (const ref of coordinates) validateRef(ref, ['specifications']);
  for (const ref of depends_on) validateRef(ref, ['specifications', 'requirements']);
}

/**
 * Get existing DOCUMENT-REGISTRY.md frontmatter
 */
function getExistingFrontmatter() {
  if (!fs.existsSync(REGISTRY_FILE)) return null;

  const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[0] : null;
}

/**
 * Update DOCUMENT-REGISTRY.md (preserves frontmatter)
 */
function updateRegistry(allDocs) {
  const todayDate = new Date().toISOString().split('T')[0];

  // Get existing frontmatter or create default
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
edit_instructions: |
  ⚠️ DO NOT EDIT THIS FILE MANUALLY ⚠️
  
  This file is automatically regenerated on every commit by script/validate-docs.mjs.
  Any manual changes will be overwritten.
  
  To update this registry:
  1. Edit the YAML frontmatter of documentation files
  2. Commit your changes
  3. The script automatically regenerates this registry
  
  For instructions, see: docs/engineering/DOC-VALIDATION-SETUP.md
---`;
  } else {
    // Update last_updated timestamp
    frontmatter = frontmatter.replace(
      /last_updated: \d{4}-\d{2}-\d{2}/,
      `last_updated: ${todayDate}`,
    );
  }

  // Build registry content
  let registry = `${frontmatter}\n\n# Document Registry\n\nMachine-readable index of all engineering documentation.\n\n⚠️ **Auto-generated file** – Do not edit manually. See frontmatter above for update instructions.\n\nUse this registry to:\n\n- Find documents by type, status, or area\n- See what Specifications implement which Requirements\n- Track project health at a glance\n- Identify stale documents needing review\n\n---\n\n## Quick Queries\n\n**Show me all active Specs:**\n\n\`\`\`\ngrep "| SPEC.*active" below\n\`\`\`\n\n**Show me all docs in area:pagination:**\n\n\`\`\`\ngrep "pagination" below\n\`\`\`\n\n**Show me all Specs implementing REQ-pagination-system:**\n\n\`\`\`\ngrep "REQ-pagination-system" below\n\`\`\`\n\n---\n\n## All Documents\n\n| ID | Type | Status | Stability | Area | Feature |\n|----|------|--------|-----------|------|--------|\n`;

  for (const doc of allDocs) {
    const id = doc.file.replace('.md', '');
    const type = doc.frontmatter?.type || DOC_TYPES[doc.type] || '?';
    const status = doc.frontmatter?.status || '?';
    const stability = doc.frontmatter?.stability || '?';
    const area = doc.frontmatter?.area || '?';
    const feature = doc.frontmatter?.feature || '?';
    registry += `| \`${id}\` | ${type} | ${status} | ${stability} | ${area} | ${feature} |\n`;
  }

  registry += `\n---\n\n_Last auto-generated: ${todayDate}_\n`;

  fs.writeFileSync(REGISTRY_FILE, registry, 'utf-8');
}

/**
 * Update folder README with document list
 */
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

  // Update Active section
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
    /## Active (Ideation|Requirements|Specifications|Plans)\n\n[\s\S]*?\n\n## (Archived|Archived \/ Deprecated|Archived \/ Completed)/,
    `## Active $1\n\n${activeList}\n\n## $2`,
  );

  // Update Archived section
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
 * Main execution
 */
function main() {
  const errors = [];
  const fixes = [];

  console.log('\n📋 Validating documentation...\n');

  const allDocs = getAllDocFiles();

  // Validate all docs (if any exist)
  if (allDocs.length > 0) {
    for (const doc of allDocs) {
      validateFrontmatter(doc, errors);
      validateNaming(doc, errors);
      validateCrossReferences(doc, allDocs, errors);
    }
  }

  // Auto-fix: Always update registry and folder READMEs (even if no docs yet)
  if (errors.length === 0) {
    try {
      updateRegistry(allDocs);
      fixes.push('✅ Updated DOCUMENT-REGISTRY.md');

      for (const type of Object.keys(DOC_FOLDERS)) {
        updateFolderReadme(type, allDocs);
      }
      fixes.push('✅ Updated all folder READMEs');
    } catch (e) {
      errors.push(`Failed to update registry: ${e.message}`);
    }
  }

  // Report results
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
