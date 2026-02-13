import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node20',
  clean: true,
  dts: false,
  external: ['better-sqlite3'],
  outExtensions() {
    return {
      js: '.js',
    };
  },
});
