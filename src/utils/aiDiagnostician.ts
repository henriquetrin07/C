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
      errorTitle: 'Tempo Limite Excedido: Cuidado com o Loop Infinito!',
      file: fileName,
      line: loopLine,
      whatWentWrong: 'O programa rodou por mais de 10 segundos sem parar e foi interrompido pelo sistema de segurança.',
      whyItHappened:
        'Em C, laços como `while(condicao)` e `for(...)` continuam rodando enquanto a condição for verdadeira (diferente de zero). Se o código esquecer de atualizar a variável contadora ou a condição de saída nunca for atingida, a CPU entra em um ciclo perpétuo.',
      educationalLesson:
        'Pense em um loop como correr em volta de uma pista de atletismo: você precisa de um contador dizendo "já dei 3 voltas, na 5ª eu paro". Se você não contar as voltas, correrá até a exaustão! Em C, o computador não adivinha quando parar, você precisa incrementar a variável (ex: i++) explicitamente.',
      mentalModel: `[ Início ]
    ↓
┌─> [ Teste: i < 5 ] ──(Falso)──> [ Fim do Programa ]
│       ↓ (Verdadeiro)
│   [ Executa o bloco ]
│   [ ⚠️ Esqueceu i++ ! i continua 0 ]
└───┘ (Repete para sempre, consumindo 100% da CPU)`,
      goldenRule: 'Regra de Ouro: Todo laço precisa de 3 coisas: 1. Início (i = 0), 2. Condição de parada (i < 10) e 3. Passo de avanço (i++).',
      miniQuiz: {
        question: 'O que acontece com `int i = 0; while(i < 5) { printf("%d", i); }`?',
        options: [
          'Imprime de 0 até 4 e finaliza',
          'Imprime 0 infinitamente porque `i` nunca muda de valor',
          'Dá erro de compilação',
        ],
        correctIndex: 1,
        explanation: 'Como não há `i++` dentro do bloco, `i` sempre vale 0, e a condição `0 < 5` é eternamente verdadeira.',
      },
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
      errorTitle: 'Falha de Segmentação (Segmentation Fault - Violação de Memória)',
      file: fileName,
      whatWentWrong: 'Seu programa tentou ler ou escrever em um endereço de memória proibido pelo Sistema Operacional.',
      whyItHappened:
        'C não possui um "Garbage Collector" ou máquina virtual protetora: o programa conversa direto com a memória física. Quando você tenta desreferenciar um ponteiro nulo (endereço 0x0) ou acessar um vetor fora do seu limite, a Unidade de Gerenciamento de Memória (MMU) do processador trava o programa para proteger o computador.',
      educationalLesson:
        'Imagine que a memória RAM é um prédio de apartamentos numerados. Você tem a chave apenas dos apartamentos que alugou (suas variáveis). Se você tentar arrombar a porta de um apartamento vizinho ou um andar inexistente, a polícia (o Sistema Operacional) interrompe você imediatamente com um SegFault!',
      mentalModel: `MEMÓRIA RAM DO SISTEMA:
[ 0x00000000 ] -> ÁREA RESTRITA (NULL) ❌ Tentou acessar aqui! -> CRASH!
[ 0x7FFF0010 ] -> int nota = 10;      ✅ Permitido (sua variável)
[ 0x7FFF0014 ] -> vetor[0]             ✅ Permitido
[ 0x7FFF0024 ] -> vetor[4]             ✅ Permitido
[ 0x7FFF0028 ] -> vetor[99]            ❌ FORA DO LIMITE! (Estouro de buffer)`,
      goldenRule: 'Regra de Ouro: Nunca use um ponteiro sem verificar se ele é diferente de NULL (`if (ptr != NULL)`), e lembre-se que um array de tamanho N vai de [0] até [N-1].',
      miniQuiz: {
        question: 'Se declaramos `int v[5];`, qual é o último índice válido para acesso?',
        options: ['v[5]', 'v[4]', 'v[1]'],
        correctIndex: 1,
        explanation: 'Em C os vetores começam no índice 0. Um vetor com 5 posições tem índices válidos de 0 a 4.',
      },
      howToFix:
        '1. Revise chamadas a `scanf`: variáveis numéricas exigem `&` (ex: `scanf("%d", &num);`).\n2. Verifique os índices de arrays para garantir que não ultrapassam o tamanho declarado.\n3. Se usar `malloc()`, confirme se o ponteiro alocado não é `NULL` antes de utilizá-lo.',
      category: 'memory',
      source: 'heuristic',
    };
  }

  // Case 3: Missing Semicolon ';'
  const semiMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*error:\s*expected\s*['‘];['’]/i
  );
  if (semiMatch) {
    const errLine = parseInt(semiMatch[2], 10);
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
      errorTitle: 'Ponto e Vírgula Faltando (;)',
      file: fileName,
      line: actualLine,
      whatWentWrong: `Faltou colocar o ponto e vírgula \`;\` no final da instrução na linha ${actualLine}.`,
      whyItHappened:
        'Diferente de linguagens como Python ou JavaScript, em C o caractere de quebra de linha (Enter) é ignorado pelo compilador. A única forma de o compilador saber onde uma ordem termina e a próxima começa é através do caractere `;`.',
      educationalLesson:
        'Pense no ponto e vírgula em C como o ponto final em uma frase da língua portuguesa. Sem o ponto final, duas ordens diferentes se fundem em um texto incompreensível. Por exemplo: "Feche a porta apague a luz" precisa de pontuação para fazer sentido!',
      mentalModel: `SEU CÓDIGO:              COMO O COMPILADOR ENXERGA:
int x = 10               ┌─ "int x = 10 printf("Olá");"
printf("Olá");          └─ ERRO: O que significa '10 printf'? Faltou ';' delimitando!`,
      goldenRule: 'Regra de Ouro: Quase todas as linhas de comando executável em C terminam com `;`. As únicas exceções comuns são `#include`, diretivas `#define` e o início de blocos com `{}`.',
      miniQuiz: {
        question: 'Qual das opções abaixo está com a pontuação 100% correta em C?',
        options: [
          'int idade = 20;',
          'int idade = 20',
          '#include <stdio.h>;',
        ],
        correctIndex: 0,
        explanation: 'Declarações e atribuições exigem `;` no final. Diretivas com `#include` não levam ponto e vírgula!',
      },
      howToFix: `Adicione \`;\` ao final da linha ${actualLine}:`,
      originalSnippet: faultyLineText,
      fixedSnippet: fixedLineText,
      fullFixedCode: newLines.join('\n'),
      category: 'syntax',
      source: 'heuristic',
    };
  }

  // Case 4: Missing '&' in scanf
  const scanfMatch = rawText.match(
    /(?:([^:\n]+):)?(\d+):(?:\d+:)?\s*(?:warning|error):\s*format\s*['‘]%[a-zA-Z]['’]\s*expects argument of type\s*['‘][^'’]*\*\s*['’],\s*but argument\s*\d+\s*has type\s*['‘](int|float|double|char)['’]/i
  );
  if (scanfMatch) {
    const errLine = parseInt(scanfMatch[2], 10);
    const lineContent = lines[errLine - 1] || '';

    const fixedContent = lineContent.replace(
      /(scanf\s*\(\s*"[^"]+"\s*,\s*)([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_m, p1, p2) => `${p1}&${p2}`
    );

    const newLines = [...lines];
    newLines[errLine - 1] = fixedContent;

    return {
      id: 'scanf-' + Date.now(),
      hasError: true,
      errorTitle: 'Falta do Operador de Endereço (&) na Função scanf',
      file: fileName,
      line: errLine,
      whatWentWrong: `Na linha ${errLine}, a função \`scanf\` recebeu o valor atual da variável em vez do endereço de memória onde ela deve salvar o valor digitado.`,
      whyItHappened:
        'Em C, todas as variáveis passadas para funções são passadas por cópia (valor). Se você passar apenas `x`, o scanf recebe apenas uma cópia de x e não consegue modificar a sua variável real! Para o scanf gravar algo na sua variável, você precisa passar o endereço de memória dela usando o operador `&` (e-comercial).',
      educationalLesson:
        'Imagine que você contratou um entregador dos correios (o scanf) para deixar uma encomenda na sua casa. Se você apenas disser "tenho uma camisa azul" (o valor da variável), ele não sabe onde entregar! Você precisa entregar o endereço da sua rua e número (o &variavel) para ele colocar a encomenda na gaveta certa.',
      mentalModel: `VARIÁVEL NA MEMÓRIA:
Nome:  num
Valor: 0
Endereço: 0x7FFE20 (localização física na placa-mãe)

scanf("%d", num)   -> Passa o número 0. O scanf tenta gravar no endereço 0x00 -> SegFault!
scanf("%d", &num)  -> Passa o endereço 0x7FFE20. O scanf guarda a digitação no lugar certo!`,
      goldenRule: 'Regra de Ouro: Ao ler tipos primitivos numéricos com scanf (int, float, double, char), SEMPRE use o `&` antes da variável: `scanf("%d", &minhaVariavel);`. A única exceção é vetor de char (strings), que já representa um endereço.',
      miniQuiz: {
        question: 'Para ler um número decimal `float preco;`, qual a linha correta?',
        options: [
          'scanf("%f", preco);',
          'scanf("%f", &preco);',
          'printf("%f", &preco);',
        ],
        correctIndex: 1,
        explanation: 'O `&` é obrigatório para informar ao scanf onde na memória o número lido deve ser guardado.',
      },
      howToFix: 'Coloque o operador `&` antes do nome da variável que receberá a leitura:',
      originalSnippet: lineContent,
      fixedSnippet: fixedContent,
      fullFixedCode: newLines.join('\n'),
      category: 'type_mismatch',
      source: 'heuristic',
    };
  }

  // Case 5: Format specifier mismatch in printf
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
      whatWentWrong: `O especificador de formato \`${wrongFormat}\` não corresponde ao tipo da variável (\`${actualType}\`).`,
      whyItHappened:
        'A função `printf` não sabe automaticamente quais tipos de variáveis você passou para ela. Ela olha os símbolos que começam com `%` para saber quantos bytes retirar da pilha da CPU e como traduzir esses zeros e uns em texto na tela.',
      educationalLesson:
        'Pense nos especificadores como moldes de confeitaria: `%d` é um molde para números inteiros (decimal), `%f` é para números quebrados (float), `%c` é para uma letra única (char) e `%s` é para palavras inteiras (string). Se você tentar colocar água em um molde furado de espaguete, o resultado é uma bagunça!',
      mentalModel: `ESPECIFICADORES FUNDAMENTAIS EM C:
┌─────────┬───────────────┬────────────────────────────┐
│ Símbolo │ Tipo          │ Exemplo                    │
├─────────┼───────────────┼────────────────────────────┤
│ %d / %i │ int (inteiro) │ printf("%d", 42);          │
│ %f      │ float/double  │ printf("%.2f", 3.14);      │
│ %c      │ char (letra)  │ printf("%c", 'A');         │
│ %s      │ string/texto  │ printf("%s", "Ola mundo"); │
│ %p      │ ponteiro/ram  │ printf("%p", (void*)&x);   │
└─────────┴───────────────┴────────────────────────────┘`,
      goldenRule: 'Regra de Ouro: %d para inteiros, %f para decimais com vírgula, %c para uma única letra entre aspas simples (\'a\') e %s para texto entre aspas duplas ("texto").',
      miniQuiz: {
        question: 'Qual especificador você deve usar para imprimir `double media = 8.75;`?',
        options: ['%d', '%f ou %lf', '%c'],
        correctIndex: 1,
        explanation: 'Números com ponto flutuante (decimais) usam `%f` (ou `%lf` para double).',
      },
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
      errorTitle: `Declaração Implícita da Função '${funcName}' (Falta de Header)`,
      file: fileName,
      line: errLine,
      whatWentWrong: `A função \`${funcName}()\` foi chamada na linha ${errLine} sem que o compilador conheça o protótipo dela.`,
      whyItHappened:
        'A partir do padrão C99, o compilador exige que toda função seja declarada antes do uso. Sem o arquivo de cabeçalho (.h), o compilador não sabe quais tipos de parâmetros a função aceita nem qual tipo ela devolve, o que pode corromper a pilha de execução.',
      educationalLesson:
        'Pense nos arquivos de cabeçalho (`#include <...h>`) como o índice de receitas de um livro de culinária. Se você pedir ao seu assistente para fazer "suflê de queijo" sem mostrar a receita correspondente, ele não saberá quais ingredientes usar nem quanto tempo assar!',
      mentalModel: `BIBLIOTECAS ESSENCIAIS EM C:
┌──────────────┬────────────────────────────────────────────────────────┐
│ Cabeçalho    │ O que ele ensina ao compilador?                        │
├──────────────┼────────────────────────────────────────────────────────┤
│ <stdio.h>    │ printf, scanf, getchar, fopen, NULL                    │
│ <stdlib.h>   │ malloc, free, exit, atoi, rand, abs                    │
│ <string.h>   │ strlen, strcpy, strcmp, strcat                         │
│ <math.h>     │ sqrt, pow, sin, cos, floor, ceil                       │
│ <stdbool.h>  │ bool, true, false (padrão C99+)                        │
└──────────────┴────────────────────────────────────────────────────────┘`,
      goldenRule: `Regra de Ouro: Usou funções matemáticas como sqrt()? Use \`#include <math.h>\`. Usou malloc/free? Use \`#include <stdlib.h>\`. Usou strings? Use \`#include <string.h>\`.`,
      miniQuiz: {
        question: 'Qual biblioteca é obrigatória para usar a função `sqrt(25)` para calcular raiz quadrada?',
        options: ['<stdio.h>', '<math.h>', '<stdlib.h>'],
        correctIndex: 1,
        explanation: '`<math.h>` contém as declarações de todas as funções matemáticas padrão do C.',
      },
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
      whatWentWrong: `Você tentou usar o nome \`${varName}\` na linha ${errLine}, mas ele nunca foi criado ou foi declarado com erro de digitação.`,
      whyItHappened:
        'C é uma linguagem estaticamente tipada. Antes de armazenar qualquer dado, você precisa instruir o compilador explicitamente sobre quanto espaço de memória reservar e qual tipo de dado será guardado (`int`, `float`, `char`, etc.). Além disso, a linguagem C é estritamente sensível a maiúsculas e minúsculas (case-sensitive).',
      educationalLesson:
        'Imagine que uma variável é uma caixa organizadora. Antes de guardar um brinquedo dentro dela, você precisa ir até a prateleira, pegar a caixa e colar uma etiqueta dizendo o que vai dentro (ex: `int idade;`). Se você tentar colocar a idade sem ter a caixa primeiro, ela cai no chão!',
      mentalModel: `COMO CRIAR UMA VARIÁVEL EM C:
┌─────────────────┬───────────────────┬────────────────────────────────┐
│ 1. Tipo do Dado │ 2. Nome do Rótulo │ 3. Inicialização Obrigatória   │
├─────────────────┼───────────────────┼────────────────────────────────┤
│ int             │ ${varName}             │ = 0;   (evita lixo de memória) │
└─────────────────┴───────────────────┴────────────────────────────────┘`,
      goldenRule: 'Regra de Ouro: Em C, variáveis não inicializadas contêm "lixo de memória" (números aleatórios deixados por outros programas). Sempre inicialize suas variáveis ao declarar: `int x = 0;`.',
      miniQuiz: {
        question: 'Em C, `idade` e `Idade` referem-se à mesma variável?',
        options: [
          'Sim, C ignora maiúsculas e minúsculas',
          'Não, C é case-sensitive e considera nomes diferentes',
          'Depende do sistema operacional',
        ],
        correctIndex: 1,
        explanation: 'C diferencia estritamente letras maiúsculas de minúsculas. `idade` e `Idade` são duas variáveis totalmente distintas.',
      },
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
      errorTitle: 'Falta a Função Principal `int main()`',
      file: fileName,
      whatWentWrong: 'O compilador não encontrou o ponto de partida do seu programa: a função `main()`.',
      whyItHappened:
        'Todo programa executável em C precisa obrigatoriamente de uma função com o nome exato `main`. Quando o Sistema Operacional executa o seu arquivo binário compilado, a CPU salta diretamente para a primeira instrução da função `main`.',
      educationalLesson:
        'Pense na função `main()` como a porta de entrada da sua casa. Uma casa pode ter salas, quartos e cozinha (outras funções), mas se não houver porta de entrada, ninguém consegue entrar!',
      mentalModel: `FLUXO DE EXECUÇÃO DO SISTEMA OPERACIONAL:
Sistema Operacional
    ↓ (Chama)
[ int main() ] ──> printf("Olá"); ──> [ return 0; ] ──> Devolve controle ao SO com sucesso!`,
      goldenRule: 'Regra de Ouro: Todo programa executável em C começa em `int main() { ... return 0; }`. O `return 0;` avisa ao sistema operacional que tudo correu perfeitamente bem!',
      miniQuiz: {
        question: 'O que o comando `return 0;` ao final da `main` sinaliza para o sistema operacional?',
        options: [
          'Que houve um erro fatal',
          'Que o programa terminou com sucesso (código de saída 0)',
          'Que o programa deve reiniciar',
        ],
        correctIndex: 1,
        explanation: 'Por convenção internacional nos sistemas operacionais (Unix, Linux, Windows), o código de saída 0 significa "sucesso sem erros".',
      },
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
      whatWentWrong: 'Faltou fechar uma chave `}` antes do fim do arquivo.',
      whyItHappened:
        'Na linguagem C, blocos de código (corpo de funções, laços `for`/`while`, estruturas `if`/`else`) são delimitados por pares de chaves `{` e `}`. Um par aberto não foi fechado antes do fim do código.',
      educationalLesson:
        'As chaves em C funcionam como parênteses em expressões matemáticas ou aspas em um diálogo: toda vez que você abre `{`, você é obrigado a fechar `}` quando o bloco terminar.',
      mentalModel: `BALANCEAMENTO DE CHAVES:
int main() {         <── 1 aberta
    if (x > 0) {     <── 2 abertas
        printf("ok");
    }                <── fechou a 2ª (ok)
}                    <── ⚠️ Faltou esta aqui!`,
      goldenRule: 'Regra de Ouro: Mantenha seu código sempre indentado (com espaços/tabs). A indentação visual revela instantaneamente quando uma chave ficou sem par correspondente.',
      miniQuiz: {
        question: 'Se você abrir 3 chaves `{`, quantas chaves `}` devem ser fechadas no total?',
        options: ['1', '3', 'Nenhuma, o compilador fecha sozinho'],
        correctIndex: 1,
        explanation: 'Cada chave aberta `{` precisa de exatamente uma chave de fechamento `}` correspondente.',
      },
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
    errorTitle: 'Diagnóstico Pedagógico do Compilador',
    file: fileName,
    line: detectedLine,
    whatWentWrong: `O compilador GCC reportou: "${rawMsg}" na linha ${detectedLine}.`,
    whyItHappened:
      'Instruções em C requerem tipagem estrita, declaração prévia de símbolos e sintaxe precisa com ponto e vírgula e parênteses balanceados.',
    educationalLesson:
      'Aprender C é como aprender a construir um motor de carro: você tem controle absoluto sobre cada engrenagem e parafuso, mas o compilador exige precisão milimétrica. Não se desanime com mensagens de erro: elas são as ferramentas de um artesão de software!',
    goldenRule: 'Dica do Professor: Leia com calma a linha informada pelo compilador. Na maioria dos casos, o erro está exatamente nela ou na linha imediatamente anterior!',
    howToFix: 'Inspecione a linha indicada no editor e verifique tipos de dados, pontuação e inclusão de bibliotecas.',
    originalSnippet: lines[detectedLine - 1] || '',
    category: 'general',
    source: 'heuristic',
  };
}
