/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  // ESLint now handles import ordering (eslint_code_quality.md §3.3)
  plugins: ['prettier-plugin-packagejson', 'prettier-plugin-tailwindcss'],
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
