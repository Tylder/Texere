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
const REGISTRY_PATH = path.join(DOCS_DIR, 'DOCUMENT-REGISTRY.md');

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
      // Handle arrays and simple values
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
    const [docId, anchor] = ref.split('#');
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
 * Generate registry entry for document
 */
function generateRegistryEntry(doc) {
  const { type: docType, file, frontmatter = {} } = doc;
  const docId = file.replace('.md', '');
  const status = frontmatter.status || '?';
  const stability = frontmatter.stability || '?';
  const area = frontmatter.area || '?';
  const feature = frontmatter.feature || '?';

  return {
    id: docId,
    title: frontmatter.title || docId,
    type: frontmatter.type || DOC_TYPES[docType],
    status,
    stability,
    area,
    feature,
    implements: frontmatter.implements || [],
    implementedBy: frontmatter.implemented_by || [],
    coordinates: frontmatter.coordinates || [],
    covers: frontmatter.covers || [],
  };
}

/**
 * Update DOCUMENT-REGISTRY.md
 */
function updateRegistry(allDocs) {
  const entries = allDocs.map(generateRegistryEntry);
  let registry = `# DOCUMENT-REGISTRY

Machine-readable index of all documentation. Auto-generated and maintained by \`script/validate-docs.mjs\`.

**IMPORTANT:** Do not edit manually. Entries are auto-generated from document YAML frontmatter.

## All Documents

| ID | Type | Status | Stability | Area | Feature |
|----|------|--------|-----------|------|---------|
`;

  for (const entry of entries) {
    registry += `| [\`${entry.id}\`](docs/engineering/${entry.type === 'IDEATION' ? '00-ideation' : entry.type === 'REQ' ? '01-requirements' : entry.type === 'SPEC' ? '02-specifications' : '03-implementation-plans'}/${entry.id}.md) | ${entry.type} | ${entry.status} | ${entry.stability} | ${entry.area} | ${entry.feature} |\n`;
  }

  registry += `\n## Relationships\n\n`;

  // Find REQs and their SPECs and PLANS
  const reqsByFeature = {};
  for (const entry of entries) {
    if (entry.type === 'REQ') {
      const key = entry.feature;
      if (!reqsByFeature[key]) reqsByFeature[key] = { reqs: [], specs: [], plans: [] };
      reqsByFeature[key].reqs.push(entry.id);
    }
  }

  for (const entry of entries) {
    if (entry.type === 'SPEC' && entry.implements.length > 0) {
      for (const req of entry.implements) {
        const reqId = req.split('#')[0];
        const matching = entries.find((e) => e.id === reqId);
        if (matching) {
          const key = matching.feature;
          if (!reqsByFeature[key]) reqsByFeature[key] = { reqs: [], specs: [], plans: [] };
          if (!reqsByFeature[key].specs.includes(entry.id)) {
            reqsByFeature[key].specs.push(entry.id);
          }
        }
      }
    }
  }

  for (const entry of entries) {
    if (entry.type === 'IMPL-PLAN' && entry.coordinates.length > 0) {
      for (const spec of entry.coordinates) {
        const specEntry = entries.find((e) => e.id === spec);
        if (specEntry) {
          const key = specEntry.feature;
          if (!reqsByFeature[key]) reqsByFeature[key] = { reqs: [], specs: [], plans: [] };
          if (!reqsByFeature[key].plans.includes(entry.id)) {
            reqsByFeature[key].plans.push(entry.id);
          }
        }
      }
    }
  }

  registry += `### Feature-based Relationships\n\n`;
  for (const [feature, docs] of Object.entries(reqsByFeature)) {
    if (docs.reqs.length > 0 || docs.specs.length > 0 || docs.plans.length > 0) {
      registry += `**${feature}:**\n`;
      if (docs.reqs.length > 0) registry += `- Requirements: ${docs.reqs.join(', ')}\n`;
      if (docs.specs.length > 0) registry += `- Specifications: ${docs.specs.join(', ')}\n`;
      if (docs.plans.length > 0) registry += `- Implementation Plans: ${docs.plans.join(', ')}\n`;
      registry += `\n`;
    }
  }

  registry += `---\n\n_Last updated: ${new Date().toISOString().split('T')[0]}_\n`;

  fs.writeFileSync(path.join(DOCS_DIR, REGISTRY_PATH), registry, 'utf-8');
  return registry;
}

/**
 * Update folder README with document list
 */
function updateFolderReadme(type, allDocs) {
  const folderName = DOC_FOLDERS[type];
  const readmePath = path.join(DOCS_DIR, folderName, 'README.md');
  let content = fs.readFileSync(readmePath, 'utf-8');

  const docsOfType = allDocs.filter(
    (d) => d.type === type && d.frontmatter?.status !== 'deprecated',
  );
  const activeDocsOfType = docsOfType.filter((d) => d.frontmatter?.status === 'active');
  const archivedDocsOfType = docsOfType.filter((d) => d.frontmatter?.status !== 'active');

  // Update Active section
  let activeList = '';
  if (activeDocsOfType.length > 0) {
    activeList = activeDocsOfType
      .map(
        (d) => `- [\`${d.file.replace('.md', '')}\`](${d.file}) (${d.frontmatter?.feature || '?'})`,
      )
      .join('\n');
  } else {
    activeList = '(None yet)';
  }

  content = content.replace(
    /## Active (Ideation|Requirements|Specifications|Plans)\n\n[\s\S]*?\n\n## (Archived|Archived \/ Deprecated|Archived \/ Completed)/,
    `## Active $1\n\n${activeList}\n\n## $2`,
  );

  // Update Archived section
  let archivedList = '';
  if (archivedDocsOfType.length > 0) {
    archivedList = archivedDocsOfType
      .map(
        (d) =>
          `- [\`${d.file.replace('.md', '')}\`](${d.file}) (${d.frontmatter?.status || '?'}) - ${d.frontmatter?.feature || '?'}`,
      )
      .join('\n');
  } else {
    archivedList = '(None yet)';
  }

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
  const warnings = [];
  const fixes = [];

  console.log('\n📋 Validating documentation...\n');

  // Get all docs
  const allDocs = getAllDocFiles();
  const changedFiles = getChangedDocFiles();

  if (allDocs.length === 0) {
    console.log('✅ No documentation files found. Skipping validation.\n');
    return;
  }

  // Validate all docs
  for (const doc of allDocs) {
    validateFrontmatter(doc, errors);
    validateNaming(doc, errors);
    validateCrossReferences(doc, allDocs, errors);
  }

  // Auto-fix: Update registry and folder READMEs
  if (changedFiles.length > 0 || errors.length === 0) {
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

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }
  }

  console.log('\n✅ Documentation validation passed!\n');
}

main();
