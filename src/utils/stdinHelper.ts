import { SourceFile } from '../types';

export interface StdinRequirement {
  requiresInput: boolean;
  functions: string[];
  expectedTypeHint?: string;
  detectedPrompts?: string[];
}

/**
 * Detects if C source code contains functions that read from stdin,
 * and extracts any user prompt messages found before them.
 */
export function detectStdinRequirements(files?: SourceFile[] | null): StdinRequirement {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return { requiresInput: false, functions: [] };
  }

  const allCode = files
    .filter(Boolean)
    .map((f) => (typeof f?.content === 'string' ? f.content : ''))
    .join('\n');

  const functions: string[] = [];

  if (/\bscanf\s*\(/.test(allCode)) functions.push('scanf');
  if (/\bgetchar\s*\(/.test(allCode)) functions.push('getchar');
  if (/\bfgets\s*\([^,]+,[^,]+,\s*stdin\s*\)/.test(allCode)) functions.push('fgets');
  if (/\b(getc|fgetc)\s*\(\s*stdin\s*\)/.test(allCode)) functions.push('fgetc');
  if (/\bcin\s*>>/.test(allCode)) functions.push('cin');
  if (/\bgetline\s*\(\s*cin\s*,/.test(allCode)) functions.push('getline');

  // Look for printf prompt strings like printf("Digite um número: ")
  const promptRegex = /printf\s*\(\s*"([^"]*(?:digite|informe|entre|insira|qual|valor|numero|nome|idade|input|enter|type)[^"]*)"/gi;
  const detectedPrompts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = promptRegex.exec(allCode)) !== null) {
    if (match[1] && match[1].trim()) {
      detectedPrompts.push(match[1].replace(/\\n/g, '').replace(/\\t/g, ' ').trim());
    }
  }

  // Detect format specifiers in scanf, e.g. %d, %s, %f
  const scanfFormatRegex = /scanf\s*\(\s*"([^"]+)"/g;
  const formatHints: string[] = [];
  while ((match = scanfFormatRegex.exec(allCode)) !== null) {
    const fmt = match[1];
    if (fmt.includes('%d') || fmt.includes('%i')) formatHints.push('número inteiro (ex: 42)');
    else if (fmt.includes('%f') || fmt.includes('%lf')) formatHints.push('número decimal (ex: 3.14)');
    else if (fmt.includes('%s')) formatHints.push('texto/palavra (ex: Maria)');
    else if (fmt.includes('%c')) formatHints.push('caractere (ex: A)');
  }

  const expectedTypeHint = formatHints.length > 0 ? formatHints[0] : undefined;

  return {
    requiresInput: functions.length > 0,
    functions,
    expectedTypeHint,
    detectedPrompts: detectedPrompts.length > 0 ? detectedPrompts : undefined,
  };
}

export interface TerminalSegment {
  type: 'stdout' | 'stdin' | 'prompt';
  text: string;
}

/**
 * Interleaves program stdout and user stdin into an authentic terminal stream.
 * In a real terminal, user input appears right after the prompt printed by the program.
 */
export function interleaveStdoutAndStdin(stdout?: string | null, stdin?: string | null): TerminalSegment[] {
  const safeStdout = typeof stdout === 'string' ? stdout : '';
  const safeStdin = typeof stdin === 'string' ? stdin : '';

  if (!safeStdout) {
    if (!safeStdin.trim()) return [];
    return [{ type: 'stdin', text: safeStdin }];
  }

  if (!safeStdin.trim()) {
    return [{ type: 'stdout', text: safeStdout }];
  }

  const stdinLines = safeStdin
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (stdinLines.length === 0) {
    return [{ type: 'stdout', text: safeStdout }];
  }

  // Look for common interactive prompt endings in stdout, like "Digite sua idade: " or "? "
  const promptEndRegex = /(:[ \t]*|\?[ \t]*|>[ \t]*)/g;
  const segments: TerminalSegment[] = [];
  let lastIndex = 0;
  let stdinIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = promptEndRegex.exec(safeStdout)) !== null && stdinIndex < stdinLines.length) {
    const promptEnd = match.index + match[0].length;
    segments.push({
      type: 'stdout',
      text: safeStdout.substring(lastIndex, promptEnd),
    });
    // Echo the input line as user entered it with a trailing newline
    segments.push({
      type: 'stdin',
      text: stdinLines[stdinIndex] + '\n',
    });
    lastIndex = promptEnd;
    stdinIndex++;
  }

  // Any remaining stdout
  if (lastIndex < safeStdout.length) {
    segments.push({
      type: 'stdout',
      text: safeStdout.substring(lastIndex),
    });
  }

  // Any remaining stdin lines that didn't have matching prompts
  while (stdinIndex < stdinLines.length) {
    segments.push({
      type: 'stdin',
      text: stdinLines[stdinIndex] + '\n',
    });
    stdinIndex++;
  }

  return segments.length > 0 ? segments : [{ type: 'stdout', text: safeStdout }];
}
