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
  educationalLesson?: string;
  mentalModel?: string;
  goldenRule?: string;
  miniQuiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  originalSnippet?: string;
  fixedSnippet?: string;
  fullFixedCode?: string;
  category: 'syntax' | 'type_mismatch' | 'memory' | 'include' | 'runtime' | 'logic' | 'warning' | 'general';
  source: 'gemini' | 'heuristic';
}

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface UserProject {
  id: string;
  userId: string;
  title: string;
  name?: string;
  description?: string;
  files: SourceFile[];
  stdin?: string;
  compilerOptions?: CompilerOptions;
  updatedAt: string;
  createdAt: string;
}

export interface CurriculumLesson {
  id: string;
  moduleNumber: number;
  title: string;
  subtitle: string;
  durationMinutes: number;
  summary: string;
  theory: string[];
  analogies: string[];
  codeExample: {
    fileName: string;
    code: string;
    explanation: string;
    suggestedStdin?: string;
  };
  challenge: {
    title: string;
    description: string;
    starterCode: string;
    hint: string;
    solutionCode: string;
    expectedOutput: string;
    suggestedStdin?: string;
  };
  keyTakeaways: string[];
}

