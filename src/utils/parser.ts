import { CompilerDiagnostic } from '../types';

export function stripAnsi(str: string): string {
  // Removes terminal color escape codes like \x1B[01;31m
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

export function parseCompilerDiagnostics(rawOutput: string): CompilerDiagnostic[] {
  if (!rawOutput) return [];
  const cleanOutput = stripAnsi(rawOutput);
  const lines = cleanOutput.split('\n');
  const diagnostics: CompilerDiagnostic[] = [];

  // Match patterns like:
  // main.c:5:10: error: expected ';' before 'return'
  // <source>:2:32: error: expected ')' before 'return'
  // main.c:8: warning: unused variable 'x'
  // utils.h:12:3: fatal error: stdio.h: No such file
  // tcc: main.c:14: error: undefined symbol 'xyz'
  const gccRegex = /^(?:.*?\/)?([^/:\s]+):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.+)$/i;
  const tccRegex = /^(?:.*?\/)?([^/:\s]+):(\d+):\s*(error|warning):\s*(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match = trimmed.match(gccRegex);
    if (match) {
      const typeStr = match[4].toLowerCase();
      let diagType: 'error' | 'warning' | 'note' = 'error';
      if (typeStr.includes('warning')) diagType = 'warning';
      else if (typeStr.includes('note')) diagType = 'note';

      // Normalize <source> to main.c or first file
      let fileName = match[1];
      if (fileName === '<source>' || fileName === 'example.c') {
        fileName = 'main.c';
      }

      diagnostics.push({
        file: fileName,
        line: parseInt(match[2], 10),
        col: match[3] ? parseInt(match[3], 10) : undefined,
        type: diagType,
        message: match[5],
        raw: trimmed,
      });
      continue;
    }

    match = trimmed.match(tccRegex);
    if (match) {
      const diagType = match[3].toLowerCase().includes('warning') ? 'warning' : 'error';
      let fileName = match[1];
      if (fileName === '<source>') fileName = 'main.c';

      diagnostics.push({
        file: fileName,
        line: parseInt(match[2], 10),
        type: diagType,
        message: match[4],
        raw: trimmed,
      });
    }
  }

  return diagnostics;
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '0 ms';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
