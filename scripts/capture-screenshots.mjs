import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import pkg from '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.js';

const { chromium } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function captureScreenshots(url, widths, outputDir, filename, selector = null) {
  // Validate inputs
  if (!url || !outputDir || !filename) {
    console.error(
      'Usage: pnpm capture-screenshots <url> <widths-json> <output-dir> <filename> [selector]',
    );
    console.error('Examples:');
    console.error('  # Full page');
    console.error(
      '  pnpm capture-screenshots http://localhost:3002/ "[360,375,390]" component-sources/lq-ai-studio/replication-artifacts/screenshots Home',
    );
    console.error('  # Component only');
    console.error(
      '  pnpm capture-screenshots http://localhost:3002/ "[360,375,390]" component-sources/lq-ai-studio/replication-artifacts/screenshots Hero "[data-testid=\\"hero\\"]"',
    );
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  const pageDir = path.join(outputDir, filename);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  // Check if screenshots already exist (skip if all exist)
  const existingFiles = fs.readdirSync(pageDir).filter((f) => f.startsWith(`${filename}-`)).length;
  if (existingFiles === widths.length) {
    console.log(`✅ All ${widths.length} screenshots already exist for ${filename}. Skipping.`);
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const captureMode = selector ? `component (${selector})` : 'full page';
    console.log(`📸 Capturing ${filename} at ${widths.length} breakpoints (${captureMode})...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // If selector provided, verify element exists
    if (selector) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count === 0) {
        console.error(`❌ Selector not found: ${selector}`);
        process.exit(1);
      }
      if (count > 1) {
        console.warn(`⚠️  Selector matches ${count} elements, capturing first one`);
      }
    }

    for (const width of widths) {
      const screenshotPath = path.join(pageDir, `${filename}-${width}.png`);

      // Skip if file exists
      if (fs.existsSync(screenshotPath)) {
        console.log(`  ⏭️  ${width}px (already exists)`);
        continue;
      }

      await page.setViewportSize({ width, height: 1080 });
      await page.waitForLoadState('networkidle');

      if (selector) {
        const element = page.locator(selector).first();
        await element.screenshot({ path: screenshotPath });
      } else {
        await page.screenshot({ fullPage: true, path: screenshotPath });
      }

      console.log(`  ✅ ${width}px`);
    }

    console.log(`\n✨ Screenshots saved to: ${pageDir}`);
  } finally {
    await browser.close();
  }
}

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('❌ Missing arguments');
  console.error(
    'Usage: pnpm capture-screenshots <url> <widths-json> <output-dir> <filename> [selector]',
  );
  console.error('Examples:');
  console.error('  # Full page');
  console.error(
    '  pnpm capture-screenshots http://localhost:3002/ "[360,375,390]" component-sources/lq-ai-studio/replication-artifacts/screenshots Home',
  );
  console.error('  # Component only');
  console.error(
    '  pnpm capture-screenshots http://localhost:3002/ "[360,375,390]" component-sources/lq-ai-studio/replication-artifacts/screenshots Hero "[data-testid=\\"hero\\"]"',
  );
  process.exit(1);
}

const [urlArg, widthsArg, outputDirArg, filenameArg, selectorArg] = args;

let widths;
try {
  widths = JSON.parse(widthsArg);
  if (!Array.isArray(widths) || !widths.every((w) => typeof w === 'number')) {
    throw new Error('Widths must be an array of numbers');
  }
} catch (error) {
  console.error('❌ Invalid widths argument:', error instanceof Error ? error.message : error);
  process.exit(1);
}

captureScreenshots(urlArg, widths, outputDirArg, filenameArg, selectorArg).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
