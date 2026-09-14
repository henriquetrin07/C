export interface SourceFile {
  id: string;
  name: string;
  content: string;
  isMain?: boolean;
}

export interface CompilerDiagnostic {
  type: 'error' | 'warning' | 'note';
  file: string;
  line: number;
  col?: number;
  message: string;
  raw: string;
}

export interface RunResult {
  success: boolean;
  phase: 'compilation' | 'execution' | 'idle';
  compiler: 'gcc' | 'tcc';
  compileOutput: string;
  compilationTimeMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut?: boolean;
  executionTimeMs?: number;
  error?: string;
  diagnostics: CompilerDiagnostic[];
}

export interface CompilerOptions {
  compiler: 'gcc' | 'tcc';
  standard: 'c89' | 'c99' | 'c11' | 'c17';
  optimization: '-O0' | '-O1' | '-O2' | '-O3' | '-Os';
  enableWall: boolean;
  enableWextra: boolean;
  enablePedantic: boolean;
  customFlags: string;
}

export interface ExampleTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Algoritmos';
  stdin?: string;
  files: SourceFile[];
}

export interface AIDiagnosis {
  id: string;
  hasError: boolean;
  errorTitle: string;
  file?: string;
  line?: number;
  col?: number;
  whatWentWrong: string;
  whyItHappened: string;
  howToFix: string;
  originalSnippet?: string;
  fixedSnippet?: string;
  fullFixedCode?: string;
  category: 'syntax' | 'type_mismatch' | 'memory' | 'include' | 'runtime' | 'logic' | 'warning' | 'general';
  source: 'gemini' | 'heuristic';
}

