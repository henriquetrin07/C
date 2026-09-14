import { AIDiagnosis, SourceFile, RunResult } from '../types';

/**
 * Intelligent C Error Diagnostic Engine
 * Analyzes compiler errors, warnings, and runtime crashes to produce
 * pedagogical explanations of what went wrong, why it happens in C, and how to fix it.
 */

export async function analyzeErrorWithAI(
  activeFile: SourceFile,
  allFiles: SourceFile[],
  runResult: RunResult | null,
  customPrompt?: string
): Promise<AIDiagnosis> {
  const code = activeFile.content;
  const fileName = activeFile.name;
  const outputText = runResult
    ? [runResult.compileOutput, runResult.stderr, runResult.stdout]
        .filter(Boolean)
        .join('\n')
    : '';

  // 1. Try server-side Gemini API (/api/ai-diagnose)
  try {
    const res = await fetch('/api/ai-diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        fileName,
        output: outputText,
        phase: runResult?.phase || 'compilation',
        exitCode: runResult?.exitCode,
        timedOut: runResult?.timedOut,
        customPrompt,
      }),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.diagnosis) {
          return {
            ...data.diagnosis,
            source: 'gemini',
          };
        }
      }
    }
  } catch {
    // Gracefully proceed to heuristic analyzer
  }

  // 2. Built-in Semantic C Rule-Based Analyzer (Instant, Reliable, Pedagogical)
  return runSemanticCHeuristicAnalysis(activeFile, allFiles, runResult);
}

/**
 * Heuristic semantic diagnostic engine based on standard GCC & Clang diagnostics
 */
export function runSemanticCHeuristicAnalysis(
  activeFile: SourceFile,
  _allFiles: SourceFile[],
  runResult: RunResult | null
): AIDiagnosis {
  const code = activeFile.content;
  const fileName = activeFile.name;
  const lines = code.split('\n');
  const rawText = runResult
    ? `${runResult.compileOutput}\n${runResult.stderr}\n${runResult.error || ''}`
    : '';

  // Case 0: Code executed successfully without errors
  if (runResult && runResult.success && !runResult.timedOut && (runResult.exitCode === 0 || runResult.exitCode === null)) {
    return {
      id: 'success-' + Date.now(),
      hasError: false,
      errorTitle: 'Código Compilado e Executado com Sucesso!',
      file: fileName,
      whatWentWrong: 'Nenhum erro de compilação ou execução foi detectado.',
      whyItHappened: 'A sintaxe do seu código está válida e a execução do processo retornou código de saída 0 (sucesso).',
      howToFix: 'Seu código está pronto. Você pode continuar adicionando lógica ou testando novos casos de teste com a entrada (stdin).',
      category: 'general',
      source: 'heuristic',
    };
  }

  // Case 1: Timeout / Loop Infinito
  if (runResult?.timedOut) {
    // Try to find while or for loop
    let loopLine = 1;
    for (let i = 0; i < lines.length; i++) {
      if (/while\s*\(|for\s*\(|do\s*\{/.test(lines[i])) {
        loopLine = i + 1;
        break;
      }
    }

    return {
      id: 'timeout-' + Date.now(),
      hasError: true,
      errorTitle: 'Tempo Limite de Execução Excedido (Possível Loop Infinito)',
      file: fileName,
      line: loopLine,
      whatWentWrong: 'O programa demorou mais de 10 segundos para finalizar e foi interrompido pelo sistema.',
      whyItHappened:
        'Na linguagem C, um laço de repetição (`while`, `for` ou `do-while`) continua executando indefinidamente se a condição de teste nunca for atualizada para falsa (0) ou se a variável de controle não for incrementada/decrementada.',
      howToFix:
        'Verifique se a variável de controle do laço é atualizada dentro do bloco (ex: `i++` ou `contador--`). Se o programa espera entrada de dados (`scanf`), certifique-se de preencher a aba "Entrada (stdin)".',
      originalSnippet: lines[loopLine - 1] || 'while (...)',
      category: 'runtime',
      source: 'heuristic',
    };
  }

  // Case 2: Segmentation Fault / Falha de Segmentação (SIGSEGV / exit code 139)
  if (
    rawText.toLowerCase().includes('segmentation fault') ||
    rawText.toLowerCase().includes('sigsegv') ||
    runResult?.exitCode === 139 ||
    runResult?.exitCode === -11
  ) {
    return {
      id: 'segfault-' + Date.now(),
      hasError: true,
      errorTitle: 'Falha de Segmentação (Segmentation Fault / SIGSEGV)',
      file: fileName,
      whatWentWrong: 'O programa tentou ler ou escrever em uma área de memória não permitida ou inexistente.',
      whyItHappened:
        'Em C, a memória é gerenciada diretamente pelo programador. Esse erro acontece quando você desreferencia um ponteiro nulo (`NULL`), acessa um índice fora dos limites de um vetor (buffer overflow), ou passa uma variável sem o operador `&` para o `scanf`.',
      howToFix:
        '1. Revise chamadas a `scanf`: variáveis numéricas exigem `&` (ex: `scanf("%d", &num);`).\n2. Verifique os índices de arrays para garantir que não ultrapassam o tamanho declarado.\n3. Se usar `malloc()`, confirme se o ponteiro alocado não é `NULL` antes de utilizá-lo.',
      category: 'memory',
      source: 'heuristic',
    };
  }

  // Case 3: Missing Semicolon ';'
  // Example: main.c:8:5: error: expected ';' before 'return'
  const semiMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*error:\s*expected\s*['‘];['’]/i
  );
  if (semiMatch) {
    const errLine = parseInt(semiMatch[2], 10);
    // Usually in C, the missing semicolon is on the previous non-empty line
    let actualLine = errLine;
    for (let l = errLine - 2; l >= 0; l--) {
      if (lines[l].trim().length > 0 && !lines[l].trim().startsWith('//') && !lines[l].trim().startsWith('/*')) {
        actualLine = l + 1;
        break;
      }
    }

    const faultyLineText = lines[actualLine - 1] || '';
    const fixedLineText = faultyLineText.trim().endsWith(';') ? faultyLineText : faultyLineText + ';';

    const newLines = [...lines];
    newLines[actualLine - 1] = fixedLineText;

    return {
      id: 'semi-' + Date.now(),
      hasError: true,
      errorTitle: 'Ponto e Vírgula Faltando (Expected \';\')',
      file: fileName,
      line: actualLine,
      whatWentWrong: `Faltou colocar o ponto e vírgula \`;\` no final do comando na linha ${actualLine}.`,
      whyItHappened:
        'Na linguagem C, cada comando e instrução deve terminar obrigatoriamente com um ponto e vírgula `;`. O compilador lê instruções sem levar em consideração quebras de linha e tentou interpretar a linha seguinte como parte desta, gerando erro de sintaxe.',
      howToFix: `Adicione \`;\` ao final da linha ${actualLine}:`,
      originalSnippet: faultyLineText,
      fixedSnippet: fixedLineText,
      fullFixedCode: newLines.join('\n'),
      category: 'syntax',
      source: 'heuristic',
    };
  }

  // Case 4: Missing '&' in scanf
  // Example: format '%d' expects argument of type 'int *', but argument 2 has type 'int'
  const scanfMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*(?:warning|error):\s*format\s*['‘]%[a-zA-Z]['’]\s*expects argument of type\s*['‘][^'’]*\*\s*['’],\s*but argument\s*\d+\s*has type\s*['‘](int|float|double|char)['’]/i
  );
  if (scanfMatch) {
    const errLine = parseInt(scanfMatch[2], 10);
    const lineContent = lines[errLine - 1] || '';

    // Fix: scanf("%d", x) -> scanf("%d", &x)
    const fixedContent = lineContent.replace(
      /(scanf\s*\(\s*"[^"]+"\s*,\s*)([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_m, p1, p2) => `${p1}&${p2}`
    );

    const newLines = [...lines];
    newLines[errLine - 1] = fixedContent;

    return {
      id: 'scanf-' + Date.now(),
      hasError: true,
      errorTitle: 'Falta do Operador de Endereço (&) no scanf',
      file: fileName,
      line: errLine,
      whatWentWrong: `Na linha ${errLine}, a função \`scanf\` recebeu a variável por valor em vez de receber seu endereço de memória.`,
      whyItHappened:
        'A linguagem C passa argumentos por valor (cópia). Para que o `scanf` consiga gravar o valor digitado pelo usuário na sua variável original, ele precisa receber um ponteiro com a posição física de memória da variável, obtido com o operador `&`.',
      howToFix: 'Coloque o operador `&` antes do nome da variável que receberá a leitura:',
      originalSnippet: lineContent,
      fixedSnippet: fixedContent,
      fullFixedCode: newLines.join('\n'),
      category: 'type_mismatch',
      source: 'heuristic',
    };
  }

  // Case 5: Format specifier mismatch in printf
  // Example: format '%d' expects argument of type 'int', but argument 2 has type 'char *'
  const formatMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*(?:warning|error):\s*format\s*['‘](%[a-zA-Z])['’]\s*expects argument of type\s*['‘]([^'’]+)['’],\s*but argument\s*\d+\s*has type\s*['‘]([^'’]+)['’]/i
  );
  if (formatMatch) {
    const errLine = parseInt(formatMatch[2], 10);
    const wrongFormat = formatMatch[3];
    const expectedType = formatMatch[4];
    const actualType = formatMatch[5];
    const lineContent = lines[errLine - 1] || '';

    let suggestedFormat = '%d';
    if (actualType.includes('char *') || actualType.includes('char[]')) suggestedFormat = '%s';
    else if (actualType.includes('float') || actualType.includes('double')) suggestedFormat = '%f';
    else if (actualType.includes('char')) suggestedFormat = '%c';
    else if (actualType.includes('*')) suggestedFormat = '%p';

    const fixedContent = lineContent.replace(wrongFormat, suggestedFormat);
    const newLines = [...lines];
    newLines[errLine - 1] = fixedContent;

    return {
      id: 'format-' + Date.now(),
      hasError: true,
      errorTitle: 'Incompatibilidade de Especificador de Formato (printf)',
      file: fileName,
      line: errLine,
      whatWentWrong: `O especificador \`${wrongFormat}\` espera um tipo \`${expectedType}\`, mas você forneceu \`${actualType}\`.`,
      whyItHappened:
        'A função `printf` em C é variádica (aceita número flexível de parâmetros). Ela depende exclusivamente das strings de formatação para saber quantos bytes ler da pilha de execução da CPU. Usar o especificador errado resulta em lixo de memória ou comportamento indefinido.',
      howToFix: `Altere o especificador de formato de \`${wrongFormat}\` para \`${suggestedFormat}\`:`,
      originalSnippet: lineContent,
      fixedSnippet: fixedContent,
      fullFixedCode: newLines.join('\n'),
      category: 'type_mismatch',
      source: 'heuristic',
    };
  }

  // Case 6: Implicit declaration of function (e.g. sqrt without math.h, printf without stdio.h)
  const implicitMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*(?:warning|error):\s*implicit declaration of function\s*['‘]([a-zA-Z0-9_]+)['’]/i
  );
  if (implicitMatch) {
    const errLine = parseInt(implicitMatch[2], 10);
    const funcName = implicitMatch[3];

    let headerNeeded = '<stdio.h>';
    if (['sqrt', 'pow', 'sin', 'cos', 'tan', 'ceil', 'floor', 'fabs'].includes(funcName)) {
      headerNeeded = '<math.h>';
    } else if (['malloc', 'free', 'calloc', 'realloc', 'exit', 'rand', 'srand', 'atoi'].includes(funcName)) {
      headerNeeded = '<stdlib.h>';
    } else if (['strlen', 'strcpy', 'strcat', 'strcmp', 'memcpy', 'memset'].includes(funcName)) {
      headerNeeded = '<string.h>';
    } else if (['isalpha', 'isdigit', 'tolower', 'toupper'].includes(funcName)) {
      headerNeeded = '<ctype.h>';
    } else if (['time', 'clock'].includes(funcName)) {
      headerNeeded = '<time.h>';
    }

    const hasHeader = code.includes(headerNeeded);
    let fullFixed = code;
    if (!hasHeader) {
      fullFixed = `#include ${headerNeeded}\n` + code;
    }

    return {
      id: 'implicit-' + Date.now(),
      hasError: true,
      errorTitle: `Declaração Implícita da Função '${funcName}'`,
      file: fileName,
      line: errLine,
      whatWentWrong: `A função \`${funcName}()\` foi chamada na linha ${errLine} sem ter sido declarada previamente.`,
      whyItHappened:
        'A partir do padrão C99, o compilador exige que todas as funções sejam declaradas antes de serem chamadas. Sem o protótipo, o compilador não sabe quais tipos de parâmetros a função aceita nem qual tipo ela retorna.',
      howToFix: `Adicione o cabeçalho \`#include ${headerNeeded}\` no topo do seu arquivo \`${fileName}\`.`,
      originalSnippet: lines[errLine - 1] || `${funcName}(...)`,
      fixedSnippet: `#include ${headerNeeded}`,
      fullFixedCode: fullFixed,
      category: 'include',
      source: 'heuristic',
    };
  }

  // Case 7: Undeclared variable ('x' undeclared)
  const undeclaredMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*error:\s*['‘]([a-zA-Z0-9_]+)['’]\s*undeclared/i
  );
  if (undeclaredMatch) {
    const errLine = parseInt(undeclaredMatch[2], 10);
    const varName = undeclaredMatch[3];
    const lineContent = lines[errLine - 1] || '';

    return {
      id: 'undeclared-' + Date.now(),
      hasError: true,
      errorTitle: `Variável '${varName}' Não Declarada`,
      file: fileName,
      line: errLine,
      whatWentWrong: `A variável \`${varName}\` foi utilizada na linha ${errLine}, mas não foi declarada com nenhum tipo.`,
      whyItHappened:
        'C é uma linguagem estaticamente tipada. Toda variável precisa ser declarada com seu tipo explícito (como `int`, `float`, `char`, `double`) antes de ser usada para que o compilador possa alocar espaço em memória.',
      howToFix: `Declare a variável antes de utilizá-la, por exemplo: \`int ${varName} = 0;\``,
      originalSnippet: lineContent,
      category: 'syntax',
      source: 'heuristic',
    };
  }

  // Case 8: Undefined reference to 'main'
  if (rawText.includes('undefined reference to `main\'') || rawText.includes('undefined reference to `WinMain\'')) {
    const mainSnippet = '\nint main(void) {\n    // Seu código aqui\n    return 0;\n}\n';
    return {
      id: 'nomain-' + Date.now(),
      hasError: true,
      errorTitle: 'Ponto de Entrada Não Encontrado (Falta a função main)',
      file: fileName,
      whatWentWrong: 'O compilador/linker não encontrou a função principal `main()`.',
      whyItHappened:
        'Todo programa executável em C precisa de uma função chamada `main` que serve como o ponto inicial de execução do processo carregado pelo sistema operacional.',
      howToFix: 'Adicione a função `int main(void)` com o `return 0;` no final:',
      fixedSnippet: 'int main(void) {\n    printf("Olá, Mundo!\\n");\n    return 0;\n}',
      fullFixedCode: code + mainSnippet,
      category: 'syntax',
      source: 'heuristic',
    };
  }

  // Case 9: Missing closing brace '}'
  if (rawText.includes('expected \'}\' at end of input')) {
    const fullFixed = code.trimEnd() + '\n}\n';
    return {
      id: 'unclosed-brace-' + Date.now(),
      hasError: true,
      errorTitle: 'Chave de Fechamento Faltando (\'}\')',
      file: fileName,
      line: lines.length,
      whatWentWrong: 'Faltou fechar um bloco ou função com a chave `}` antes do fim do arquivo.',
      whyItHappened:
        'Na linguagem C, blocos de funções, laços (`for`, `while`) e estruturas condicionais (`if`) são delimitados por pares `{` e `}`. Um par aberto não foi fechado.',
      howToFix: 'Adicione uma chave `}` no final do arquivo para fechar o bloco aberto:',
      fixedSnippet: '}',
      fullFixedCode: fullFixed,
      category: 'syntax',
      source: 'heuristic',
    };
  }

  // Generic fallback diagnostic if specific pattern not matched
  const genericLineMatch = rawText.match(/(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*(?:error|warning):\s*(.+)/i);
  const detectedLine = genericLineMatch ? parseInt(genericLineMatch[2], 10) : 1;
  const rawMsg = genericLineMatch ? genericLineMatch[3] : rawText.split('\n')[0] || 'Erro de compilação';

  return {
    id: 'generic-' + Date.now(),
    hasError: true,
    errorTitle: 'Diagnóstico de Erro do Compilador',
    file: fileName,
    line: detectedLine,
    whatWentWrong: `O compilador GCC reportou: "${rawMsg}" na linha ${detectedLine}.`,
    whyItHappened:
      'Instruções em C requerem tipagem estrita, declaração prévia de símbolos e sintaxe precisa com ponto e vírgula e parênteses balanceados.',
    howToFix: 'Inspecione a linha indicada no editor e verifique tipos de dados, pontuação e inclusão de bibliotecas.',
    originalSnippet: lines[detectedLine - 1] || '',
    category: 'general',
    source: 'heuristic',
  };
}
