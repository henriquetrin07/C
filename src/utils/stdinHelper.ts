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
export function detectStdinRequirements(files: SourceFile[]): StdinRequirement {
  const allCode = files.map((f) => f.content).join('\n');
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
export function interleaveStdoutAndStdin(stdout: string, stdin: string): TerminalSegment[] {
  if (!stdout) {
    if (!stdin) return [];
    return [{ type: 'stdin', text: stdin }];
  }

  if (!stdin.trim()) {
    return [{ type: 'stdout', text: stdout }];
  }

  const stdinLines = stdin
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (stdinLines.length === 0) {
    return [{ type: 'stdout', text: stdout }];
  }

  // Look for common interactive prompt endings in stdout, like "Digite sua idade: " or "? "
  const promptEndRegex = /(:\s*|\?\s*|\n(?=[A-ZÀ-Ú0-9]))/g;
  let firstPromptIndex = -1;
  const match = promptEndRegex.exec(stdout);
  if (match) {
    firstPromptIndex = match.index + match[0].length;
  }

  if (firstPromptIndex > 0 && firstPromptIndex < stdout.length) {
    const beforePrompt = stdout.substring(0, firstPromptIndex);
    const afterPrompt = stdout.substring(firstPromptIndex);

    const segments: TerminalSegment[] = [
      { type: 'stdout', text: beforePrompt },
    ];

    for (const inp of stdinLines) {
      segments.push({ type: 'stdin', text: inp });
    }

    if (afterPrompt.trim()) {
      segments.push({ type: 'stdout', text: afterPrompt.startsWith('\n') ? afterPrompt : '\n' + afterPrompt });
    }

    return segments;
  }

  // Default fallback: prompt lines followed by user input then remaining output
  return [
    { type: 'stdout', text: stdout },
    ...stdinLines.map((inp) => ({ type: 'stdin' as const, text: inp })),
  ];
}
