/**
 * C Beautify / Code Formatter (OnlineGDB style)
 * Formats C source code with proper indentation, bracket styling, and spacing.
 */
export function formatCCode(source: string): string {
  if (!source) return '';

  const lines = source.split('\n');
  let indentLevel = 0;
  const indentStr = '    '; // 4 spaces like standard OnlineGDB
  const formattedLines: string[] = [];

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Check for block comments
    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      formattedLines.push(indentStr.repeat(indentLevel) + line);
      continue;
    }

    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
      formattedLines.push(indentStr.repeat(indentLevel) + line);
      continue;
    }

    // Keep preprocessor directives at column 0
    if (line.startsWith('#')) {
      formattedLines.push(line);
      continue;
    }

    // Empty lines
    if (line.length === 0) {
      formattedLines.push('');
      continue;
    }

    // Handle case/default labels
    const isCaseOrDefault = /^(case\s+[^:]+|default)\s*:/.test(line);

    // Count closing and opening braces
    // Be careful to ignore braces inside single or double quotes
    let openBraces = 0;
    let closeBraces = 0;
    let inString = false;
    let inChar = false;
    let escaped = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"' && !inChar) {
        inString = !inString;
        continue;
      }
      if (char === "'" && !inString) {
        inChar = !inChar;
        continue;
      }
      if (inString || inChar) continue;

      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
    }

    // If line starts with a closing brace, decrease indent before printing
    if (line.startsWith('}') || line.startsWith(']')) {
      indentLevel = Math.max(0, indentLevel - 1);
    } else if (closeBraces > openBraces) {
      indentLevel = Math.max(0, indentLevel - (closeBraces - openBraces));
    }

    const currentIndent = isCaseOrDefault ? Math.max(0, indentLevel - 1) : indentLevel;
    formattedLines.push(indentStr.repeat(currentIndent) + line);

    // If line has more opening than closing braces, increase indent for subsequent lines
    if (openBraces > closeBraces) {
      if (!line.startsWith('}') && !line.startsWith(']')) {
        indentLevel += openBraces - closeBraces;
      }
    } else if (line.startsWith('}') && openBraces > 0) {
      indentLevel += openBraces;
    }
  }

  return formattedLines.join('\n');
}
