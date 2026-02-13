const RESERVED_OPERATORS = new Set(['OR', 'AND', 'NOT', 'NEAR']);

export const sanitizeFtsQuery = (input: string): string => {
  if (input.length === 0) {
    return '';
  }

  const withoutQuotes = input.replaceAll('"', ' ').replace(/[(){}[\]]/g, ' ');
  const tokens = withoutQuotes
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => {
      if (RESERVED_OPERATORS.has(token.toUpperCase())) {
        return `"${token.toUpperCase()}"`;
      }

      return token;
    });

  return tokens.join(' ');
};
