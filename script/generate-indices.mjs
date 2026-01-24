#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOCS_DIR = 'docs/engineering';

const DOC_FOLDERS = {
  ideation: '00-ideation',
  requirements: '01-requirements',
  specifications: '02-specifications',
  plans: '03-implementation-plans',
  meta: 'meta',
};

const INDEXING_CONFIG = {
  enabled: true,
  summary_mode: 'skip', // 'error' or 'skip'
  min_level: 2,
  max_level: 3,
  subsection_token_threshold: 300, // Skip subsections if parent section < this many tokens
  token_estimate_multiplier: 1.3, // Token estimation (word count × multiplier)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

/**
 * Estimate tokens in text (word count * 1.3).
 */
function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * INDEXING_CONFIG.token_estimate_multiplier);
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
        const summaryParts = [];
        summaryParts.push(summaryLine.replace(/^Summary:\s*/, '').trim());

        let nextLine = summaryLineNum + 1;
        while (nextLine < lines.length && lines[nextLine].trim()) {
          if (lines[nextLine].match(/^(#{2,3})\s+/)) break;
          summaryParts.push(lines[nextLine].trim());
          nextLine++;
        }

        summary = summaryParts.join(' ');
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

    // Trim trailing empty lines from the section
    while (endLine > lineNum && !lines[endLine].trim()) {
      endLine--;
    }

    // Get section content for token estimation
    const sectionContent = lines.slice(lineNum, endLine + 1).join('\n');
    const tokenEst = estimateTokens(sectionContent);

    const section = {
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
  if (!frontmatterMatch) return false; // No frontmatter, skip

  let frontmatterYaml = frontmatterMatch[1];
  const contentAfterFrontmatter = doc.content.substring(frontmatterMatch[0].length);

  // Remove any existing index from frontmatter to get clean base
  const cleanFrontmatterYaml = frontmatterYaml.replace(/\s+(index):[\s\S]*$/m, '');

  // Extract sections fresh from the raw content (after removing frontmatter)
  const errors = [];
  let sections = extractSections(contentAfterFrontmatter, errors, doc.relativePath);
  if (errors.length > 0 || sections.length === 0) {
    return false;
  }

  // Build index with DUMMY line numbers [0, 0]
  let indexYaml = `\nindex:\n  sections:`;

  for (const section of sections) {
    indexYaml += `\n    - title: "${section.title}"`;
    indexYaml += `\n      lines: [0, 0]`;

    if (section.summary) {
      indexYaml += `\n      summary: '${section.summary}'`;
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
        indexYaml += `\n        - title: "${sub.title}"`;
        indexYaml += `\n          lines: [0, 0]`;

        if (sub.summary) {
          indexYaml += `\n          summary: '${sub.summary}'`;
        }

        indexYaml += `\n          token_est: ${sub.token_est}`;
      }
    }
  }

  // Build complete document with dummy lines
  const newFrontmatter = `---\n${cleanFrontmatterYaml}${indexYaml}\n---`;
  const fullContent = newFrontmatter + contentAfterFrontmatter;

  // Write to real file with dummy index
  fs.writeFileSync(doc.path, fullContent, 'utf-8');

  // Format the document with Prettier
  try {
    execSync(`npx prettier "${doc.path}" --write`, { stdio: 'pipe' });
  } catch {
    // Silently ignore formatting errors
  }

  // Read the formatted content from real file
  const formattedContent = fs.readFileSync(doc.path, 'utf-8');

  // Now find actual line numbers of each section heading in the formatted content
  const lines = formattedContent.split('\n');
  const sectionLineMap = new Map(); // Map title -> [startLine, endLine]

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];

      // Find end line (next heading of same or higher level, or EOF)
      let endLine = lines.length - 1;
      for (let j = i + 1; j < lines.length; j++) {
        const nextHeading = lines[j].match(/^(#{2,3})\s+(.+)$/);
        if (nextHeading && nextHeading[1].length <= level) {
          endLine = j - 1;
          break;
        }
      }

      // Trim trailing empty lines
      while (endLine > i && !lines[endLine].trim()) {
        endLine--;
      }

      sectionLineMap.set(title, [i + 1, endLine + 1]); // 1-based line numbers
    }
  }

  // Rebuild index with REAL line numbers from formatted content
  let realIndexYaml = `\nindex:\n  sections:`;

  for (const section of sections) {
    const [startLine, endLine] = sectionLineMap.get(section.title) || [0, 0];
    realIndexYaml += `\n    - title: "${section.title}"`;
    realIndexYaml += `\n      lines: [${startLine}, ${endLine}]`;

    if (section.summary) {
      realIndexYaml += `\n      summary: '${section.summary}'`;
    }

    realIndexYaml += `\n      token_est: ${section.token_est}`;

    // Only include subsections if parent section exceeds token threshold
    if (
      section.subsections &&
      section.subsections.length > 0 &&
      section.token_est >= INDEXING_CONFIG.subsection_token_threshold
    ) {
      realIndexYaml += '\n      subsections:';
      for (const sub of section.subsections) {
        const [subStart, subEnd] = sectionLineMap.get(sub.title) || [0, 0];
        realIndexYaml += `\n        - title: "${sub.title}"`;
        realIndexYaml += `\n          lines: [${subStart}, ${subEnd}]`;

        if (sub.summary) {
          realIndexYaml += `\n          summary: '${sub.summary}'`;
        }

        realIndexYaml += `\n          token_est: ${sub.token_est}`;
      }
    }
  }

  // Build final content with real line numbers
  const finalFrontmatter = `---\n${cleanFrontmatterYaml}${realIndexYaml}\n---`;
  const finalContent = finalFrontmatter + contentAfterFrontmatter;

  // Only proceed if changed
  if (finalContent !== formattedContent) {
    fs.writeFileSync(doc.path, finalContent, 'utf-8');

    // Run Prettier one more time to ensure final formatting
    try {
      execSync(`npx prettier "${doc.path}" --write`, { stdio: 'pipe' });
    } catch {
      // Silently ignore formatting errors
    }

    return true; // Indicate doc was modified
  }

  return false;
}

/**
 * Load cache of file hashes from last successful run.
 */
function loadHashCache() {
  const cacheFile = '.docindex-cache.json';
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save cache of file hashes after successful run.
 */
function saveHashCache(cache) {
  fs.writeFileSync('.docindex-cache.json', JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Compute SHA256 hash of file content.
 */
function hashFileContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Filter docs to only those that have changed since last run.
 */
function getChangedDocs(allDocs, hashCache) {
  return allDocs.filter((doc) => {
    const currentHash = hashFileContent(doc.content);
    const cachedHash = hashCache[doc.relativePath];
    return currentHash !== cachedHash;
  });
}

function main() {
  console.log('\n📑 Generating section indices...\n');

  const allDocs = getAllDocFiles();
  const hashCache = loadHashCache();
  const changedDocs = getChangedDocs(allDocs, hashCache);

  if (!INDEXING_CONFIG.enabled) {
    console.log('⏭️  Section indexing is disabled in INDEXING_CONFIG\n');
    return;
  }

  if (changedDocs.length === 0) {
    console.log(`✅ No documents changed since last run (skipping indexing)\n`);
    return;
  }

  console.log(`📝 Processing ${changedDocs.length} changed document(s)...\n`);

  let indexedCount = 0;
  for (const doc of changedDocs) {
    if (embedSectionIndex(doc)) {
      indexedCount++;
      console.log(`  ✅ Generated index for ${doc.relativePath}`);
      // Update hash cache for this doc
      hashCache[doc.relativePath] = hashFileContent(doc.content);
    }
  }

  // Save updated cache
  saveHashCache(hashCache);

  if (indexedCount > 0) {
    console.log(`\n✨ Generated section indices in ${indexedCount} document(s)\n`);
  } else {
    console.log(`\n✅ No index changes needed for changed documents\n`);
  }
}

main();
