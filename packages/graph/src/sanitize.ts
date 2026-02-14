const RESERVED_OPERATORS = new Set(['AND', 'OR', 'NOT', 'NEAR']);
const BAREWORD_RE = /^[a-zA-Z0-9_\u0080-\uffff]+$/;
const TOKEN_RE = /"[^"]*"|\S+/g;

export const sanitizeFtsQueryStrict = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';

  const tokens = [...trimmed.matchAll(TOKEN_RE)].map((m) => m[0]);
  const result: string[] = [];

  for (const token of tokens) {
    // Reserved operator (case-sensitive exact match) → pass through
    if (RESERVED_OPERATORS.has(token)) {
      result.push(token);
      continue;
    }

    // Valid bareword → pass through
    if (BAREWORD_RE.test(token)) {
      result.push(token);
      continue;
    }

    // Prefix query: ends with *
    if (token.endsWith('*')) {
      const stem = token.slice(0, -1);
      if (BAREWORD_RE.test(stem)) {
        // Valid bareword prefix → pass through
        result.push(token);
      } else {
        // Non-bareword prefix → quote stem, append star
        result.push(`"${stem.replaceAll('"', '""')}"*`);
      }
      continue;
    }

    // User-quoted phrase: starts and ends with "
    if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
      result.push(token);
      continue;
    }

    // Everything else → double-quote, escaping internal " as ""
    result.push(`"${token.replaceAll('"', '""')}"`);
  }

  return result.join(' ');
};
