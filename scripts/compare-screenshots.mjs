#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getImageFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getImageFiles(fullPath)));
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getRelativePath(fullPath, basePath) {
  return path.relative(basePath, fullPath);
}

async function getImageDimensions(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  return { width: metadata.width, height: metadata.height };
}

async function calculatePixelDiff(path1, path2) {
  const [img1, dims1] = await Promise.all([
    sharp(path1).raw().toBuffer(),
    getImageDimensions(path1),
  ]);

  const [img2, dims2] = await Promise.all([
    sharp(path2).resize(dims1.width, dims1.height).raw().toBuffer(),
    getImageDimensions(path2),
  ]);

  if (dims1.width !== dims2.width || dims1.height !== dims2.height) {
    return {
      pixelsDifferent: dims1.width * dims1.height,
      percentDifferent: 100,
      totalPixels: dims1.width * dims1.height,
      dimensionsMismatch: true,
    };
  }

  const diff = Buffer.alloc(img1.length);
  const pixelsDifferent = pixelmatch(img1, img2, diff, dims1.width, dims1.height, {
    threshold: 0.1,
  });

  const totalPixels = dims1.width * dims1.height;
  const percentDifferent = (pixelsDifferent / totalPixels) * 100;

  return {
    pixelsDifferent,
    percentDifferent,
    totalPixels,
    dimensionsMismatch: false,
  };
}

async function calculateSimilarity(path1, path2) {
  const img1 = await sharp(path1).resize(32, 32).raw().toBuffer();
  const img2 = await sharp(path2).resize(32, 32).raw().toBuffer();

  let sum = 0;
  for (let i = 0; i < Math.min(img1.length, img2.length); i++) {
    const diff = Math.abs(img1[i] - img2[i]);
    sum += diff;
  }

  const maxDiff = 255 * Math.min(img1.length, img2.length);
  const similarity = ((maxDiff - sum) / maxDiff) * 100;

  return Math.max(0, Math.min(100, similarity));
}

async function compareScreenshots(folder1, folder2) {
  const files1 = await getImageFiles(folder1);
  const files2 = await getImageFiles(folder2);

  const fileMap1 = new Map();
  const fileMap2 = new Map();

  for (const file of files1) {
    const relative = getRelativePath(file, folder1);
    fileMap1.set(relative, file);
  }

  for (const file of files2) {
    const relative = getRelativePath(file, folder2);
    fileMap2.set(relative, file);
  }

  const results = {
    identical: [],
    similar: [],
    different: [],
    missingInFolder1: [],
    missingInFolder2: [],
    timestamp: new Date().toISOString(),
  };

  const allKeys = new Set([...fileMap1.keys(), ...fileMap2.keys()]);

  for (const relPath of allKeys) {
    if (!fileMap1.has(relPath)) {
      results.missingInFolder1.push({
        file: relPath,
        path2: fileMap2.get(relPath),
      });
      continue;
    }

    if (!fileMap2.has(relPath)) {
      results.missingInFolder2.push({
        file: relPath,
        path1: fileMap1.get(relPath),
      });
      continue;
    }

    const path1 = fileMap1.get(relPath);
    const path2 = fileMap2.get(relPath);

    console.log(`Comparing: ${relPath}`);

    const [pixelData, fuzzyScore] = await Promise.all([
      calculatePixelDiff(path1, path2),
      calculateSimilarity(path1, path2),
    ]);

    const result = {
      file: relPath,
      path1,
      path2,
      fuzzyScore,
      pixelDiff: pixelData,
    };

    if (pixelData.pixelsDifferent === 0) {
      results.identical.push(result);
    } else if (fuzzyScore >= 95) {
      results.similar.push(result);
    } else {
      results.different.push(result);
    }
  }

  return results;
}

function generateReport(results) {
  return JSON.stringify(results, null, 2);
}

async function main() {
  const [, , folder1, folder2] = process.argv;

  if (!folder1 || !folder2) {
    console.error('Usage: node compare-screenshots.mjs <folder1> <folder2>');
    process.exit(1);
  }

  if (!fs.existsSync(folder1) || !fs.existsSync(folder2)) {
    console.error('Error: Both folders must exist');
    process.exit(1);
  }

  console.log(`Comparing screenshots...`);
  console.log(`Folder 1: ${folder1}`);
  console.log(`Folder 2: ${folder2}\n`);

  const results = await compareScreenshots(folder1, folder2);

  const jsonReport = generateReport(results);
  const reportPath = 'screenshot-comparison-report.json';
  fs.writeFileSync(reportPath, jsonReport);

  console.log(jsonReport);
  console.log(`\n✓ Report saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
