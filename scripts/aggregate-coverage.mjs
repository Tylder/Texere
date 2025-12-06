#!/usr/bin/env node

/**
 * Aggregate coverage across all packages in the monorepo.
 * Reads coverage-summary.json from each package and calculates totals.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.nx', '.pnpm', '.cache']);

function findCoverageSummaries(startDir) {
  const results = [];
  const stack = [startDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;

        if (entry.name === 'coverage') {
          const coverageDir = path.join(current, entry.name);
          const summaryPath = path.join(coverageDir, 'coverage-summary.json');
          const finalPath = path.join(coverageDir, 'coverage-final.json');
          if (fs.existsSync(summaryPath)) {
            const pkgPath = path.relative(root, current);
            results.push({ pkg: pkgPath || '.', path: summaryPath, type: 'summary' });
          } else if (fs.existsSync(finalPath)) {
            const pkgPath = path.relative(root, current);
            results.push({ pkg: pkgPath || '.', path: finalPath, type: 'final' });
          }
          continue;
        }

        stack.push(path.join(current, entry.name));
      }
    }
  }

  return results;
}

function readCoverage(filePath, type) {
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (type === 'summary') return data.total;

  // coverage-final.json shape: { "<file>": { statementMap, s, f, b, ... } }
  const totals = {
    lines: { total: 0, covered: 0 },
    statements: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
  };

  Object.values(data).forEach((fileStat) => {
    const statements = fileStat.s ?? {};
    const functions = fileStat.f ?? {};
    const branches = fileStat.b ?? {};

    const statementTotals = Object.keys(statements).length;
    const statementCovered = Object.values(statements).filter((v) => v > 0).length;
    totals.statements.total += statementTotals;
    totals.statements.covered += statementCovered;

    // Approximate lines using statements (istanbul final doesn't carry line totals explicitly)
    totals.lines.total += statementTotals;
    totals.lines.covered += statementCovered;

    const functionTotals = Object.keys(functions).length;
    const functionCovered = Object.values(functions).filter((v) => v > 0).length;
    totals.functions.total += functionTotals;
    totals.functions.covered += functionCovered;

    const branchTotals = Object.values(branches).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );
    const branchCovered = Object.values(branches).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.filter((v) => v > 0).length : 0),
      0,
    );
    totals.branches.total += branchTotals;
    totals.branches.covered += branchCovered;
  });

  // Convert to summary-like shape with pct for printing
  const toPct = (covered, total) => (total > 0 ? (covered / total) * 100 : 0);
  return {
    lines: {
      ...totals.lines,
      pct: Number(toPct(totals.lines.covered, totals.lines.total).toFixed(2)),
    },
    statements: {
      ...totals.statements,
      pct: Number(toPct(totals.statements.covered, totals.statements.total).toFixed(2)),
    },
    functions: {
      ...totals.functions,
      pct: Number(toPct(totals.functions.covered, totals.functions.total).toFixed(2)),
    },
    branches: {
      ...totals.branches,
      pct: Number(toPct(totals.branches.covered, totals.branches.total).toFixed(2)),
    },
  };
}

function aggregateCoverage() {
  const coverageFiles = findCoverageSummaries(root);
  const coverages = coverageFiles
    .map(({ pkg, path: filePath, type }) => {
      const coverage = readCoverage(filePath, type);
      return coverage ? { pkg, coverage } : null;
    })
    .filter(Boolean);

  if (coverages.length === 0) {
    console.log('ℹ️  No coverage reports found. Run `pnpm test:coverage` first.');
    return;
  }

  // Aggregate metrics
  const totals = {
    lines: { total: 0, covered: 0 },
    statements: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
  };

  coverages.forEach(({ coverage }) => {
    Object.keys(totals).forEach((key) => {
      totals[key].total += coverage[key].total;
      totals[key].covered += coverage[key].covered;
    });
  });

  // Calculate percentages
  const pcts = Object.entries(totals).reduce((acc, [key, val]) => {
    acc[key] = val.total > 0 ? ((val.covered / val.total) * 100).toFixed(2) : '0.00';
    return acc;
  }, {});

  // Print summary header
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    MONOREPO COVERAGE SUMMARY                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  // Print per-package breakdown
  console.log('\nPer-Package Coverage:');
  console.log('┌─────────────────────┬──────────┬──────────┬───────────┬──────────┐');
  console.log('│ Package             │ Lines    │ Branches │ Functions │ Stmts    │');
  console.log('├─────────────────────┼──────────┼──────────┼───────────┼──────────┤');

  coverages.forEach(({ pkg, coverage }) => {
    const name = pkg.replace(/^(packages|apps)\//, '').padEnd(19);
    const lines = `${coverage.lines.pct}%`.padStart(8);
    const branches = `${coverage.branches.pct}%`.padStart(8);
    const functions = `${coverage.functions.pct}%`.padStart(9);
    const stmts = `${coverage.statements.pct}%`.padStart(8);
    console.log(`│ ${name} │ ${lines} │ ${branches} │ ${functions} │ ${stmts} │`);
  });

  // Print aggregate totals
  console.log('├─────────────────────┼──────────┼──────────┼───────────┼──────────┤');
  const totalName = 'TOTAL'.padEnd(19);
  const totalLines = `${pcts.lines}%`.padStart(8);
  const totalBranches = `${pcts.branches}%`.padStart(8);
  const totalFunctions = `${pcts.functions}%`.padStart(9);
  const totalStmts = `${pcts.statements}%`.padStart(8);
  console.log(
    `│ ${totalName} │ ${totalLines} │ ${totalBranches} │ ${totalFunctions} │ ${totalStmts} │`,
  );
  console.log('└─────────────────────┴──────────┴──────────┴───────────┴──────────┘');

  // Print absolute numbers
  console.log(`\nAbsolute Coverage:
  Lines:      ${totals.lines.covered}/${totals.lines.total} covered
  Statements: ${totals.statements.covered}/${totals.statements.total} covered
  Functions:  ${totals.functions.covered}/${totals.functions.total} covered
  Branches:   ${totals.branches.covered}/${totals.branches.total} covered\n`);
}

aggregateCoverage();
