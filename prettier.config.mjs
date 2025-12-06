/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  // Plugin order matters: packagejson → sort-imports → tailwindcss (last).
  plugins: [
    'prettier-plugin-packagejson',
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder: [
    '^node:', // Node.js builtins
    '^(?!\\.)(?!@)', // External packages
    '^@(?!repo/)', // Other scoped packages
    '^@repo/', // Workspace packages
    '^@/', // Absolute aliases
    '^\\.\\.[/\\\\]', // Parent imports
    '^\\./', // Sibling imports
  ],
  importOrderSeparation: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderSortSpecifiers: true,
  overrides: [
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
    {
      files: ['apps/**/*.{tsx,jsx}'],
      options: {
        jsxSingleQuote: false,
        bracketSameLine: false,
      },
    },
  ],
};

export default config;
