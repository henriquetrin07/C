import { SourceFile, CompilerOptions, RunResult } from '../types';
import { parseCompilerDiagnostics, stripAnsi } from './parser';

export type EngineMode = 'native' | 'cloud';

// Checks whether the local Express backend with GCC/TCC is reachable and functional
export async function checkBackendAvailability(): Promise<EngineMode> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('/api/health', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.status === 'ok') {
        // If native GCC or TCC is installed on backend
        if (data.compilers && (data.compilers.gcc || data.compilers.tcc)) {
          return 'native';
        }
        return 'cloud';
      }
    }
  } catch {
    // Network error or offline
  }
  return 'cloud';
}

// Bundle multiple C files (.h and .c) into a unified translation unit
export function bundleCFiles(files: SourceFile[]): string {
  if (files.length === 1) {
    return files[0].content;
  }

  const headers = files.filter((f) => f.name.endsWith('.h'));
  const cFiles = files.filter((f) => f.name.endsWith('.c'));
  const mainFile =
    cFiles.find((f) => /int\s+main\s*\(/.test(f.content)) || cFiles[0] || files[0];
  const otherCFiles = cFiles.filter((f) => f.id !== mainFile.id);

  // Replace internal header quotes e.g. #include "calc.h" with inlined notice
  const cleanInternalIncludes = (code: string) => {
    return code.replace(/#include\s+["<]([^">]+)[">]/g, (match, inc) => {
      if (files.some((f) => f.name === inc)) {
        return `/* inlined: ${inc} */`;
      }
      return match;
    });
  };

  let combined = '/* === C Web IDE Multi-file Compilation Unit === */\n\n';

  // 1. Headers first
  for (const h of headers) {
    combined += `/* --- File: ${h.name} --- */\n`;
    combined += cleanInternalIncludes(h.content) + '\n\n';
  }

  // 2. Auxiliary .c implementations next
  for (const c of otherCFiles) {
    combined += `/* --- File: ${c.name} --- */\n`;
    combined += cleanInternalIncludes(c.content) + '\n\n';
  }

  // 3. Main .c implementation last
  if (mainFile) {
    combined += `/* --- File: ${mainFile.name} (entrypoint) --- */\n`;
    combined += cleanInternalIncludes(mainFile.content) + '\n';
  }

  return combined;
}

// Execute C code via Godbolt Compiler Explorer REST API (public, CORS open, no API key needed)
async function executeViaCloudGCC(
  files: SourceFile[],
  stdin: string,
  options: CompilerOptions
): Promise<RunResult> {
  const startTime = Date.now();
  const bundledSource = bundleCFiles(files);

  // Build flags
  const userArgs = [`-std=${options.standard}`, options.optimization, '-Wall', '-Wextra'];
  if (options.enablePedantic) userArgs.push('-pedantic');
  if (options.customFlags && options.customFlags.trim()) {
    const custom = options.customFlags.trim().split(/\s+/);
    userArgs.push(...custom);
  }
  userArgs.push('-lm');

  const payload = {
    source: bundledSource,
    options: {
      userArguments: userArgs.join(' '),
      executeParameters: {
        args: [],
        stdin: stdin || '',
      },
      compilerOptions: {
        executorRequest: true,
      },
    },
    allowExecutions: true,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000); // 18s timeout

    const res = await fetch('https://godbolt.org/api/compiler/cg131/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    const totalTimeMs = Date.now() - startTime;
    const compilationTimeMs = data.buildResult?.execTime || Math.min(totalTimeMs, 300);
    const executionTimeMs = Math.max(0, totalTimeMs - compilationTimeMs);

    // Collect compiler build messages (stderr/stdout from compiler)
    let compileOutput = '';
    if (data.buildResult && Array.isArray(data.buildResult.stderr)) {
      compileOutput = data.buildResult.stderr
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
    }

    // Collect runtime stdout & stderr
    let stdout = '';
    if (Array.isArray(data.stdout)) {
      stdout = data.stdout
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
      if (stdout && !stdout.endsWith('\n')) stdout += '\n';
    }

    let stderr = '';
    if (Array.isArray(data.stderr)) {
      stderr = data.stderr
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
      if (stderr && !stderr.endsWith('\n')) stderr += '\n';
    }

    const cleanCompileOutput = stripAnsi(compileOutput);
    const diagnostics = parseCompilerDiagnostics(cleanCompileOutput);
    const didExecute = Boolean(data.didExecute);
    const success = didExecute && data.code === 0 && !data.timedOut;

    return {
      success,
      phase: didExecute ? 'execution' : 'compilation',
      compiler: 'gcc',
      compileOutput: cleanCompileOutput,
      compilationTimeMs,
      stdout,
      stderr: stripAnsi(stderr),
      exitCode: data.code !== undefined ? data.code : didExecute ? 0 : 1,
      timedOut: Boolean(data.timedOut),
      executionTimeMs,
      diagnostics,
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError'
      ? 'Tempo limite de compilação/execução na nuvem excedido (18s).'
      : `Falha ao conectar com o serviço de compilação: ${err.message}`;

    return {
      success: false,
      phase: 'compilation',
      compiler: 'gcc',
      compileOutput: errorMsg,
      compilationTimeMs: 0,
      stdout: '',
      stderr: '',
      exitCode: -1,
      diagnostics: [],
    };
  }
}

// Main execution function: attempts native server first, seamlessly falls back to cloud compiler
export async function executeCCode(
  files: SourceFile[],
  stdin: string,
  options: CompilerOptions,
  preferredEngine: EngineMode
): Promise<{ result: RunResult; usedEngine: EngineMode }> {
  // If native server is preferred, try it first
  if (preferredEngine === 'native') {
    try {
      const flags: string[] = [];
      if (options.enablePedantic) flags.push('-pedantic');
      if (options.customFlags.trim()) {
        const parts = options.customFlags.trim().split(/\s+/);
        flags.push(...parts);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout to avoid hanging

      const res = await fetch('/api/compile-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.name, content: f.content })),
          stdin: typeof stdin === 'string' ? stdin : '',
          compiler: options.compiler,
          standard: options.standard,
          optimization: options.optimization,
          flags,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const rawDiagText = (data.compileOutput || '') + '\n' + (data.stderr || '');
        const diagnostics = parseCompilerDiagnostics(rawDiagText);

        return {
          usedEngine: 'native',
          result: {
            success: Boolean(data.success),
            phase: data.phase || 'idle',
            compiler: data.compiler || options.compiler,
            compileOutput: data.compileOutput || '',
            compilationTimeMs: data.compilationTimeMs || 0,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            exitCode: data.exitCode !== undefined ? data.exitCode : null,
            timedOut: data.timedOut || false,
            executionTimeMs: data.executionTimeMs || 0,
            error: data.error,
            diagnostics,
          },
        };
      }
    } catch {
      // Local server failed or unreachable, seamlessly fall back to Cloud GCC below
    }
  }

  // Fallback: Run via Cloud GCC engine
  const cloudResult = await executeViaCloudGCC(files, stdin, options);
  return {
    usedEngine: 'cloud',
    result: cloudResult,
  };
}

// Generate Assembly code: tries local server first, falls back to Cloud GCC assembly
export async function generateAssembly(
  code: string,
  standard: string,
  optimization: string
): Promise<{ success: boolean; assembly?: string; error?: string }> {
  // 1. Try local server
  try {
    const res = await fetch('/api/assembly', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code, standard, optimization }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success) {
        return { success: true, assembly: data.assembly };
      }
    }
  } catch {}

  // 2. Cloud GCC Assembly generator
  try {
    const payload = {
      source: code,
      options: {
        userArguments: `-std=${standard} ${optimization} -fverbose-asm`,
        executeParameters: { args: [], stdin: '' },
      },
    };

    const res = await fetch('https://godbolt.org/api/compiler/cg131/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (Array.isArray(data.asm) && data.asm.length > 0) {
      const asmText = data.asm
        .map((line: any) => (typeof line === 'string' ? line : line.text || ''))
        .join('\n');
      return { success: true, assembly: asmText };
    }

    if (data.buildResult && Array.isArray(data.buildResult.stderr)) {
      const errText = data.buildResult.stderr
        .map((line: any) => (typeof line === 'string' ? line : line.text || ''))
        .join('\n');
      return { success: false, error: stripAnsi(errText) };
    }
  } catch (err: any) {
    return { success: false, error: `Falha ao gerar assembly: ${err.message}` };
  }

  return { success: false, error: 'Não foi possível gerar a saída Assembly.' };
}

// AI Code Assistance: tries local server first, falls back to rich client-side C Tutor heuristics
export async function getAiAssistance(
  code: string,
  output: string,
  type: 'explain-error' | 'explain-code' | 'optimize'
): Promise<string> {
  try {
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code, output, type }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.text) {
        return data.text;
      }
    }
  } catch {}

  // Client-side C Tutor Heuristic Knowledge Base
  if (type === 'explain-error') {
    const cleanOutput = stripAnsi(output);
    const errors: string[] = [];

    if (/expected [';\)]/i.test(cleanOutput)) {
      errors.push(
        '• Sintaxe / Pontuação: Verifique se esqueceu um ponto e vírgula `;` no final de uma instrução anterior ou o fechamento de parênteses `)`.'
      );
    }
    if (/implicit declaration of function/i.test(cleanOutput)) {
      errors.push(
        '• Header Ausente: Uma função foi chamada sem declaração prévia. Adicione o `#include` correspondente (ex: `#include <stdio.h>` para `printf`/`scanf`, `#include <stdlib.h>` para `malloc`/`free` ou `#include <string.h>` para `strlen`/`strcpy`).'
      );
    }
    if (/format.*expects argument of type/i.test(cleanOutput)) {
      errors.push(
        '• Incompatibilidade em printf/scanf: O especificador de formato (ex: `%d`, `%f`, `%s`) não corresponde ao tipo da variável fornecida.'
      );
    }
    if (/Segmentation fault|SIGSEGV/i.test(cleanOutput)) {
      errors.push(
        '• Falha de Segmentação (SIGSEGV): O programa tentou acessar uma posição de memória inválida ou ponteiro NULL. Verifique se passou `&` no `scanf`, se alocou memória com `malloc`, ou se ultrapassou o tamanho de um vetor.'
      );
    }

    return (
      '### 💡 Análise do Tutor C\n\n' +
      (errors.length > 0
        ? errors.join('\n\n') + '\n\n'
        : 'Identificamos um diagnóstico do compilador GCC.\n\n') +
      '**Diretrizes de correção:**\n' +
      '1. Localize a linha indicada pelo compilador na aba "Diagnósticos".\n' +
      '2. Certifique-se de que todas as variáveis foram declaradas com seus tipos antes do uso.\n' +
      '3. Sempre confirme que a função `main` retorna um número inteiro (`int main(void)` com `return 0;`).'
    );
  }

  if (type === 'optimize') {
    return (
      '### ⚡ Sugestões de Otimização e Boas Práticas em C\n\n' +
      '1. **Passagem por Referência (Ponteiros):** Para structs grandes, passe ponteiros `const MinhaStruct *ptr` em vez de passar por valor para economizar cópias na pilha.\n' +
      '2. **Localidade de Referência:** Acesse matrizes linha por linha `[i][j]` em vez de coluna por coluna para maximizar os acertos no cache da CPU (L1/L2).\n' +
      '3. **Nível de Otimização:** Use a flag `-O2` ou `-O3` nas configurações para habilitar vetorização automática e inlining pelo GCC.\n' +
      '4. **Gerenciamento de Memória:** Sempre libere buffers alocados com `malloc()` usando `free()` para evitar vazamento de memória (memory leaks).'
    );
  }

  // explain-code
  return (
    '### 📖 Análise Didática do Código C\n\n' +
    '• **Ponto de Entrada:** O programa se inicia na função `main()`, retornando código de saída `0` para indicar sucesso ao sistema operacional.\n' +
    '• **Estrutura de Tipagem Estática:** Todas as variáveis em C possuem alocação de tamanho fixo em memória definida em tempo de compilação.\n' +
    '• **Fluxo de Execução:** Instruções são executadas sequencialmente, interagindo com as bibliotecas padrão da libc (`stdio`, `stdlib`, `math`).'
  );
}
