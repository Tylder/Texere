/**
 * Custom ESLint rule: require-component-suffix
 * Enforces that component files in /components/ have required suffixes: .client, .server, .static, .isr, or .test
 * Pattern: kebab-case.(client|server|static|isr|test).tsx
 *
 * Governed by: docs/specs/web_naming_spec.md §4 (File Suffix System)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce that component files have required suffixes (.client, .server, .static, .isr, or .test)',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/Texere/docs/specs/web_naming_spec.md#4-file-suffix-system',
    },
    fixable: null,
    messages: {
      missingSuffix:
        'Component file "{{ filename }}" must have a suffix: .client, .server, .static, .isr, or .test. Example: button.client.tsx',
    },
  },

  create(context) {
    const filename = context.getFilename();

    // Only check files in components/ directories
    if (!filename.includes('/components/')) {
      return {};
    }

    // Only check .ts and .tsx files
    if (!filename.match(/\.(ts|tsx)$/)) {
      return {};
    }

    // Exclude special files that don't need suffixes
    const basename = filename.split('/').pop();
    const excludePatterns = [
      'layout.tsx',
      'layout.ts',
      'route.ts',
      'middleware.ts',
      'next-env.d.ts',
      'eslint.config.js',
    ];

    if (excludePatterns.includes(basename)) {
      return {};
    }

    // Check if filename has one of the required suffixes before the extension
    const requiredSuffixPattern = /\.(client|server|static|isr|test)\.(ts|tsx)$/;

    if (!requiredSuffixPattern.test(filename)) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'missingSuffix',
            data: {
              filename: basename,
            },
          });
        },
      };
    }

    return {};
  },
};
