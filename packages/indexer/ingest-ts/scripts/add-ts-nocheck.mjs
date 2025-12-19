import fs from 'node:fs';
import path from 'node:path';

const generatedDir = path.resolve(process.cwd(), 'packages/indexer/ingest-ts/src/scip/generated');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.ts')) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.startsWith('// @ts-nocheck')) {
      continue;
    }
    fs.writeFileSync(fullPath, `// @ts-nocheck\n${content}`);
  }
}

if (fs.existsSync(generatedDir)) {
  walk(generatedDir);
}
