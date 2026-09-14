import { CurriculumLesson } from '../types';

export const CURRICULUM_MODULES: CurriculumLesson[] = [
  {
    id: 'c-mod-1',
    moduleNumber: 1,
    title: 'O Primeiro Contato com a Linguagem C',
    subtitle: 'A anatomia de um programa, o papel do compilador e a função main',
    durationMinutes: 15,
    summary:
      'Descubra como o código escrito por você é transformado em instruções executáveis pelo processador e compreenda cada linha do lendário Olá Mundo.',
    theory: [
      'A linguagem C foi criada em 1972 por Dennis Ritchie nos laboratórios Bell para construir o sistema operacional Unix. É uma linguagem de "médio nível", o que significa que ela combina a legibilidade humana com o controle direto do hardware.',
      'Diferente do Python ou JavaScript (que são interpretados em tempo real), o C é uma linguagem COMPILADA. O compilador (como o GCC) lê seu texto, verifica a sintaxe e gera um arquivo binário em código de máquina (zeros e uns) específico para o processador.',
      'Todo programa C executável começa obrigatoriamente na função `main()`. É a porta de entrada por onde o Sistema Operacional entrega o controle do computador ao seu código.',
      'A instrução `#include <stdio.h>` diz ao compilador para carregar a biblioteca padrão de entrada e saída (Standard Input/Output), necessária para utilizar funções como `printf()`.',
    ],
    analogies: [
      'O Compilador é como um arquiteto e mestre de obras: você entrega a planta baixa (código fonte em C) e ele constrói o prédio de tijolos de verdade (o binário executável). Se a planta tiver um erro estrutural, ele se recusa a construir até você corrigir!',
      'A função `main()` é a portaria principal de um shopping center. Não importa quantas lojas existam dentro, todos os clientes começam a entrar pela mesma porta.',
    ],
    codeExample: {
      fileName: 'modulo1_ola_mundo.c',
      code: `#include <stdio.h>

int main(void) {
    // printf imprime mensagens na tela (console)
    // O '\\n' representa a quebra de linha (pula para a linha de baixo)
    printf("Olá, futuro mestre em C!\\n");
    printf("Este é o seu primeiro programa compilado com sucesso.\\n");

    // return 0 avisa ao Sistema Operacional que o programa terminou sem erros
    return 0;
}
`,
      explanation:
        'Observe as linhas: `#include <stdio.h>` no topo, a declaração `int main(void)`, a chave `{` que abre o bloco, comandos terminando com `;`, e `return 0;` no final fechando com `}`.',
    },
    challenge: {
      title: 'Desafio do Módulo 1: O Cartão de Visitas',
      description:
        'Crie um programa que imprima na tela seu nome na primeira linha, sua linguagem de programação favorita na segunda linha e a frase "Eu amo programar em C!" na terceira linha.',
      starterCode: `#include <stdio.h>

int main(void) {
    // Imprima aqui as 3 linhas pedidas usando printf e \\n
    
    return 0;
}
`,
      hint: 'Lembre-se de colocar \\n no final de cada texto para que as frases não fiquem coladas na mesma linha!',
      solutionCode: `#include <stdio.h>

int main(void) {
    printf("Nome: Programador C\\n");
    printf("Linguagem: C (Padrão ISO)\\n");
    printf("Eu amo programar em C!\\n");
    return 0;
}
`,
      expectedOutput:
        'Nome: Programador C\nLinguagem: C (Padrão ISO)\nEu amo programar em C!\n',
    },
    keyTakeaways: [
      'Todo comando executável em C termina com ponto e vírgula (;).',
      '#include <stdio.h> é indispensável para usar printf e scanf.',
      'O \\n serve para pular de linha.',
      'return 0 indica execução bem-sucedida para o Sistema Operacional.',
    ],
  },
  {
    id: 'c-mod-2',
    moduleNumber: 2,
    title: 'Variáveis e Tipos Primitivos de Dados',
    subtitle: 'Criando caixinhas na memória RAM: int, float, double e char',
    durationMinutes: 20,
    summary:
      'Aprenda como a memória do computador funciona, quais os tipos de dados fundamentais do C e como escolher o tipo certo para economizar memória e evitar overflow.',
    theory: [
      'Uma variável é um espaço reservado na memória RAM do computador com um nome (identificador) e um tipo fixo.',
      'C é uma linguagem estaticamente tipada: você precisa declarar o tipo antes de usar. Principais tipos: `int` (números inteiros, normalmente 4 bytes), `float` (decimais com precisão simples, 4 bytes), `double` (decimais com alta precisão, 8 bytes), e `char` (um único caractere, 1 byte).',
      'Variáveis não inicializadas contêm "lixo de memória" (dados que sobraram de programas que rodaram anteriormente naquela área da RAM). Por isso, sempre inicialize suas variáveis: `int total = 0;`.',
      'Para imprimir o conteúdo de uma variável, usamos os especificadores de formato: `%d` para inteiros, `%f` (ou `%.2f`) para decimais, e `%c` para caracteres.',
    ],
    analogies: [
      'Imagine a memória RAM como um gaveteiro de escritório com etiquetas. Um gaveteiro pequeno é um `char` (só cabe 1 letra), uma gaveta padrão é um `int` (cabe um número inteiro) e uma gaveta funda é um `double` (cabe números com muitas casas decimais).',
      'Lixo de memória é como alugar um armário público no metrô: se você não limpar e colocar seus pertences novos dentro, encontrará os jornais velhos deixados pela pessoa anterior!',
    ],
    codeExample: {
      fileName: 'modulo2_variaveis.c',
      code: `#include <stdio.h>

int main(void) {
    // Declarando e inicializando variáveis
    int idade = 21;
    float altura = 1.78f;
    double salario = 4500.50;
    char inicial = 'G';

    // Imprimindo as variáveis com seus respectivos especificadores
    printf("Inicial: %c\\n", inicial);
    printf("Idade: %d anos\\n", idade);
    printf("Altura: %.2f metros\\n", altura);
    printf("Salário: R$ %.2f\\n", salario);

    // Modificando o valor de uma variável existente
    idade = idade + 1;
    printf("No próximo aniversário: %d anos\\n", idade);

    return 0;
}
`,
      explanation:
        'Veja como cada tipo tem um especificador correspondente no printf: %c para char, %d para int, e %.2f para float/double limitando a duas casas decimais.',
    },
    challenge: {
      title: 'Desafio do Módulo 2: O Calculador de Média',
      description:
        'Declare 3 notas com casas decimais (tipo float ou double) para um aluno: nota1 = 7.5, nota2 = 8.0, nota3 = 9.5. Calcule a média aritmética e imprima o resultado formatado com 1 casa decimal (ex: 8.3).',
      starterCode: `#include <stdio.h>

int main(void) {
    // 1. Declare as 3 notas
    // 2. Calcule a média: (nota1 + nota2 + nota3) / 3.0
    // 3. Imprima usando %.1f
    
    return 0;
}
`,
      hint: 'Divida por 3.0 (com ponto) para garantir que a divisão seja decimal e não inteira.',
      solutionCode: `#include <stdio.h>

int main(void) {
    float n1 = 7.5f;
    float n2 = 8.0f;
    float n3 = 9.5f;
    float media = (n1 + n2 + n3) / 3.0f;

    printf("Média final do aluno: %.1f\\n", media);
    return 0;
}
`,
      expectedOutput: 'Média final do aluno: 8.3\n',
    },
    keyTakeaways: [
      'int: inteiros (%d ou %i)',
      'float / double: números reais com ponto flutuante (%f ou %lf)',
      'char: um único caractere entre aspas simples (%c)',
      'Sempre inicialize variáveis ao declará-las para evitar lixo de memória.',
    ],
  },
  {
    id: 'c-mod-3',
    moduleNumber: 3,
    title: 'Entrada de Dados: scanf e o Mistério do &',
    subtitle: 'Conversando com o usuário através do teclado e entendendo endereços de memória',
    durationMinutes: 20,
    summary:
      'Aprenda como receber dados digitados pelo usuário com a função scanf e entenda de uma vez por todas por que o operador & é obrigatório.',
    theory: [
      'A função `scanf()` é a contraparte do `printf()`: ela lê dados enviados pela entrada padrão (`stdin`, como o teclado) e os grava nas variáveis do seu programa.',
      'O primeiro argumento do `scanf()` é uma string de formatação indicando o que esperar, como `"%d"` para um número inteiro.',
      'O segundo argumento DEVE ser o endereço de memória da variável, obtido com o operador `&` (e-comercial). Exemplo: `scanf("%d", &numero);`.',
      'Por que o `&` é obrigatório? Porque em C todas as funções recebem cópias dos valores (passagem por valor). Se você passar apenas `numero`, o scanf recebe uma cópia do valor e não tem como alterar a variável original. Passando `&numero`, o scanf recebe a localização exata da variável na placa-mãe!',
    ],
    analogies: [
      'O `&` é como fornecer o seu CEP e endereço completo para a transportadora. Se você disser apenas "eu tenho uma bicicleta" (o valor da variável), a transportadora não sabe onde entregar a nova peça! Com o endereço `&bicicleta`, ela vai até sua casa e entrega o pacote.',
    ],
    codeExample: {
      fileName: 'modulo3_scanf.c',
      code: `#include <stdio.h>

int main(void) {
    int anoNascimento = 0;
    int anoAtual = 2026;

    printf("Digite o ano em que você nasceu: ");
    // O operador & é crucial aqui!
    scanf("%d", &anoNascimento);

    int idadeAproximada = anoAtual - anoNascimento;
    printf("Em %d, você tem ou fará aproximadamente %d anos!\\n", anoAtual, idadeAproximada);

    return 0;
}
`,
      suggestedStdin: '2000',
      explanation:
        'Ao rodar no navegador, preencha o valor na aba "Entrada (stdin)" para que o scanf capture o dado.',
    },
    challenge: {
      title: 'Desafio do Módulo 3: Conversor de Temperatura',
      description:
        'Escreva um programa que leia uma temperatura em graus Celsius (°C) e calcule e exiba o equivalente em Fahrenheit (°F), usando a fórmula: F = (C * 9.0 / 5.0) + 32.',
      starterCode: `#include <stdio.h>

int main(void) {
    float celsius = 0.0f;
    // 1. Leia o valor em Celsius com scanf
    // 2. Calcule fahrenheit
    // 3. Imprima o resultado formatado
    
    return 0;
}
`,
      hint: 'Não esqueça do & antes da variável no scanf: `scanf("%f", &celsius);`. Use a aba Entrada (stdin) para fornecer o valor 25.0.',
      suggestedStdin: '25.0',
      solutionCode: `#include <stdio.h>

int main(void) {
    float celsius = 0.0f;
    scanf("%f", &celsius);

    float fahrenheit = (celsius * 9.0f / 5.0f) + 32.0f;
    printf("%.1f C equivale a %.1f F\\n", celsius, fahrenheit);
    return 0;
}
`,
      expectedOutput: '25.0 C equivale a 77.0 F\n',
    },
    keyTakeaways: [
      'Use scanf("%d", &variavel) com & para tipos numéricos primitivos.',
      'Esquecer o & no scanf causa Segmentation Fault ou comportamento imprevisível.',
      'Para ler no IDE Web, digite a entrada na aba "Entrada (stdin)".',
    ],
  },
  {
    id: 'c-mod-4',
    moduleNumber: 4,
    title: 'Tomando Decisões: if, else e switch',
    subtitle: 'Fluxo condicional, operadores relacionais e lógica booleana em C',
    durationMinutes: 20,
    summary:
      'Capacite seu programa a tomar decisões inteligentes baseadas em condições, notas, senhas e comparações.',
    theory: [
      'O comando `if (condicao)` executa um bloco de código se a expressão for verdadeira. Em C, "verdadeiro" é qualquer valor numérico diferente de zero, e "falso" é zero.',
      'Operadores relacionais: `==` (igual a), `!=` (diferente), `<` (menor), `>` (maior), `<=` (menor ou igual), `>=` (maior ou igual).',
      'ATENÇÃO AO PERIGO: `=` é operador de ATRIBUIÇÃO (guarda um valor). `==` é operador de COMPARAÇÃO (testa se são iguais). Escrever `if (x = 5)` é um erro clássico que sempre dá verdadeiro!',
      'Operadores lógicos: `&&` (E lógico - ambas devem ser verdadeiras), `||` (OU lógico - pelo menos uma deve ser verdadeira) e `!` (NÃO lógico - inverte a condição).',
      'Para múltiplas opções inteiras ou de caracteres, o comando `switch (variavel) { case 1: ... break; }` é mais limpo e rápido que muitos `if/else` encadeados.',
    ],
    analogies: [
      'Uma estrutura `if/else` é como uma bifurcação em uma estrada com uma placa de trânsito: se o semáforo estiver verde, você segue em frente; senão (else), você para e aguarda.',
      'O comando `switch` com `break` é como os botões de um elevador: você aperta o andar desejado, o elevador vai direto até lá e para (`break`). Sem o `break`, o elevador continuaria caindo por todos os andares seguintes (fall-through)!',
    ],
    codeExample: {
      fileName: 'modulo4_decisoes.c',
      code: `#include <stdio.h>

int main(void) {
    int nota = 85;

    printf("Avaliação do Desempenho (Nota: %d):\\n", nota);

    if (nota >= 90) {
        printf("Conceito A: Excelente! Domínio avançado.\\n");
    } else if (nota >= 70) {
        printf("Conceito B: Aprovado! Bom trabalho.\\n");
    } else if (nota >= 50) {
        printf("Conceito C: Em recuperação. Pratique mais.\\n");
    } else {
        printf("Conceito D: Reprovado. Revise as lições desde o início.\\n");
    }

    return 0;
}
`,
      explanation:
        'O compilador avalia as condições de cima para baixo. Assim que encontra uma verdadeira, executa o bloco e pula as demais branches do if-else.',
    },
    challenge: {
      title: 'Desafio do Módulo 4: Par ou Ímpar?',
      description:
        'Escreva um programa que leia um número inteiro e diga se ele é "PAR" ou "ÍMPAR". Dica: use o operador de resto da divisão `%` (se num % 2 == 0, é par).',
      starterCode: `#include <stdio.h>

int main(void) {
    int numero = 0;
    // Leia o número e faça a verificação com if/else
    
    return 0;
}
`,
      hint: 'O operador `%` retorna o resto: `if (numero % 2 == 0) printf("PAR\\n"); else printf("ÍMPAR\\n");`',
      suggestedStdin: '14',
      solutionCode: `#include <stdio.h>

int main(void) {
    int numero = 0;
    scanf("%d", &numero);

    if (numero % 2 == 0) {
        printf("%d é PAR\\n", numero);
    } else {
        printf("%d é ÍMPAR\\n", numero);
    }
    return 0;
}
`,
      expectedOutput: '14 é PAR\n',
    },
    keyTakeaways: [
      'Nunca confunda = (atribuição) com == (comparação de igualdade).',
      'No switch, sempre use break no final de cada case.',
      '0 é falso; qualquer outro valor é considerado verdadeiro em C.',
    ],
  },
  {
    id: 'c-mod-5',
    moduleNumber: 5,
    title: 'Laços de Repetição: while, for e do-while',
    subtitle: 'Automatizando tarefas repetitivas e evitando loops infinitos',
    durationMinutes: 20,
    summary:
      'Aprenda como fazer o computador repetir tarefas milhares de vezes em frações de segundo com controle total sobre as variáveis de parada.',
    theory: [
      'Computadores são incríveis em fazer a mesma tarefa milhões de vezes sem errar nem se cansar. Os laços de repetição servem exatamente para isso.',
      'O laço `for (inicio; condicao; incremento)` é ideal quando sabemos de antemão quantas vezes queremos repetir (ex: de 1 até 10).',
      'O laço `while (condicao)` é ideal quando queremos repetir enquanto algo for verdadeiro, sem saber exatamente quantas voltas serão necessárias.',
      'O laço `do { ... } while (condicao);` garante que o bloco execute PELO MENOS uma vez antes de testar a condição de parada.',
      'Os comandos `break` (interrompe e sai imediatamente do laço) e `continue` (pula direto para a próxima iteração) oferecem controle fino do fluxo.',
    ],
    analogies: [
      'O `for` é como fazer 10 flexões na academia: você começa na 1ª, conta até a 10ª e para.',
      'O `while` é como encher um copo d\'água: você continua despejando água enquanto o copo não estiver cheio.',
      'Um loop infinito é como esquecer a torneira aberta sem válvula de segurança: a água transborda e o programa trava!',
    ],
    codeExample: {
      fileName: 'modulo5_lacos.c',
      code: `#include <stdio.h>

int main(void) {
    printf("=== Contagem com FOR (1 a 5) ===\\n");
    for (int i = 1; i <= 5; i++) {
        printf("Passo %d\\n", i);
    }

    printf("\\n=== Tabuada do 7 com WHILE ===\\n");
    int contador = 1;
    while (contador <= 5) {
        printf("7 x %d = %d\\n", contador, 7 * contador);
        contador++; // OBRIGATÓRIO: sem isso, loop infinito!
    }

    return 0;
}
`,
      explanation:
        'Observe a estrutura do for: `int i = 1` inicializa, `i <= 5` é a condição de continuação, e `i++` é o incremento a cada volta.',
    },
    challenge: {
      title: 'Desafio do Módulo 5: Somatório de 1 a N',
      description:
        'Leia um número inteiro N e calcule a soma de todos os números de 1 até N usando um laço for (ex: se N=5, soma = 1+2+3+4+5 = 15).',
      starterCode: `#include <stdio.h>

int main(void) {
    int n = 0;
    int soma = 0;
    // 1. Leia n
    // 2. Use for de 1 até n somando na variável 'soma'
    // 3. Imprima o resultado
    
    return 0;
}
`,
      hint: 'No for: `for (int i = 1; i <= n; i++) { soma += i; }`',
      suggestedStdin: '5',
      solutionCode: `#include <stdio.h>

int main(void) {
    int n = 0;
    int soma = 0;
    scanf("%d", &n);

    for (int i = 1; i <= n; i++) {
        soma += i;
    }

    printf("A soma de 1 ate %d e: %d\\n", n, soma);
    return 0;
}
`,
      expectedOutput: 'A soma de 1 ate 5 e: 15\n',
    },
    keyTakeaways: [
      'for: ideal para contagens conhecidas.',
      'while: ideal para condições variáveis.',
      'Sempre garanta que a variável de controle avance em direção ao fim do loop.',
    ],
  },
  {
    id: 'c-mod-6',
    moduleNumber: 6,
    title: 'Funções e Modularização',
    subtitle: 'Dividir para conquistar: criando funções reutilizáveis e organizadas',
    durationMinutes: 25,
    summary:
      'Descubra como quebrar programas grandes em pequenas partes independentes, fáceis de testar e reutilizar.',
    theory: [
      'Uma função é um bloco isolado de código com nome, que recebe parâmetros de entrada (opcionais), executa instruções e pode devolver um valor de retorno.',
      'Estrutura de uma função: `tipo_retorno nome_funcao(parametros) { ... }`. Exemplo: `int somar(int a, int b) { return a + b; }`. Se a função não retorna nada, usamos `void`.',
      'Protótipos de função: em C, uma função deve ser conhecida pelo compilador antes de ser chamada. Você pode declarar a assinatura no topo do arquivo (`int somar(int a, int b);`) e escrever o corpo completo depois da função `main()`.',
      'Escopo de variáveis: variáveis declaradas dentro de uma função são locais (só existem enquanto aquela função estiver executando). Variáveis com o mesmo nome em funções diferentes são totalmente independentes na memória.',
    ],
    analogies: [
      'Uma função é como uma torradeira elétrica: você insere pão (parâmetro), ela aplica calor (processamento interno) e cospe a torrada pronta (valor de retorno). Você não precisa saber como os circuitos internos funcionam para usá-la!',
    ],
    codeExample: {
      fileName: 'modulo6_funcoes.c',
      code: `#include <stdio.h>

// Protótipos das funções
int calcularPotencia(int base, int expoente);
void exibirMensagemBoasVindas(void);

int main(void) {
    exibirMensagemBoasVindas();

    int resultado = calcularPotencia(2, 8); // 2 elevado a 8 = 256
    printf("2 elevado a 8 = %d\\n", resultado);

    return 0;
}

// Implementação da função que retorna valor
int calcularPotencia(int base, int expoente) {
    int res = 1;
    for (int i = 0; i < expoente; i++) {
        res *= base;
    }
    return res;
}

// Implementação da função sem retorno (void)
void exibirMensagemBoasVindas(void) {
    printf("--- Calculadora Modular de Potencias ---\\n");
}
`,
      explanation:
        'Observe como o código fica limpo e legível. A main fica curta e cada tarefa específica fica sob a responsabilidade de uma função dedicada.',
    },
    challenge: {
      title: 'Desafio do Módulo 6: Função Fatorial',
      description:
        'Crie uma função `long long fatorial(int n)` que receba um número inteiro positivo e retorne o fatorial dele (ex: fatorial de 5 = 5*4*3*2*1 = 120). Na main, chame a função para n = 6 e imprima.',
      starterCode: `#include <stdio.h>

// Crie aqui a função fatorial

int main(void) {
    // Chame a função para o número 6 e imprima o resultado
    
    return 0;
}
`,
      hint: 'Lembre-se que fatorial de 0 ou 1 é 1. Use um for de 1 até n multiplicando.',
      solutionCode: `#include <stdio.h>

long long fatorial(int n) {
    long long f = 1;
    for (int i = 1; i <= n; i++) {
        f *= i;
    }
    return f;
}

int main(void) {
    int num = 6;
    printf("Fatorial de %d = %lld\\n", num, fatorial(num));
    return 0;
}
`,
      expectedOutput: 'Fatorial de 6 = 720\n',
    },
    keyTakeaways: [
      'Use funções para evitar duplicar código (Princípio DRY - Don\'t Repeat Yourself).',
      'Use void quando a função não precisar retornar nenhum valor.',
      'Declare protótipos no topo do código para o compilador conhecer suas funções.',
    ],
  },
  {
    id: 'c-mod-7',
    moduleNumber: 7,
    title: 'Vetores (Arrays) e o Segredo das Strings',
    subtitle: 'Agrupando dados em sequência e entendendo o terminador nulo \\0',
    durationMinutes: 25,
    summary:
      'Aprenda como armazenar listas de dados na memória contígua e domine a manipulação de texto em C com a biblioteca string.h.',
    theory: [
      'Um vetor (array) é uma coleção sequencial de variáveis do mesmo tipo, alocadas de forma contínua na memória física.',
      'Declaração: `int notas[5];` cria espaço para 5 inteiros. IMPORTANTE: os índices em C começam no 0! Um array de tamanho 5 tem índices válidos: `[0], [1], [2], [3], [4]`. Acessar `notas[5]` é um erro gravíssimo (buffer overflow)!',
      'O que é uma string em C? C NÃO tem um tipo primitivo chamado "string". Em C, uma string é simplesmente um array de caracteres (`char[]`) terminado pelo caractere especial `\'\\0\'` (nulo, código ASCII 0).',
      'Por que o `\'\\0\'` é essencial? Funções como `printf("%s", str)` leem caractere por caractere da memória até encontrar o `\'\\0\'`. Se você esquecer do `\'\\0\'`, o printf continuará imprimindo o lixo da memória adjacente até travar!',
      'Funções essenciais de `<string.h>`: `strlen(s)` (tamanho do texto), `strcpy(dest, orig)` (copia texto), `strcmp(s1, s2)` (compara se são iguais).',
    ],
    analogies: [
      'Um array é como uma cartela de ovos com 12 divisórias numeradas de 0 a 11. Cada divisória guarda exatamente um ovo.',
      'O caractere `\\0` em uma string é como o ponto final no fim de um parágrafo. Sem o ponto final, o leitor não sabe onde parar e continua lendo a folha seguinte!',
    ],
    codeExample: {
      fileName: 'modulo7_strings.c',
      code: `#include <stdio.h>
#include <string.h>

int main(void) {
    // Array de números inteiros
    int numeros[4] = {10, 20, 30, 40};
    printf("Primeiro elemento: %d (indice 0)\\n", numeros[0]);
    printf("Ultimo elemento:   %d (indice 3)\\n", numeros[3]);

    // String em C: array de char com terminador \\0
    char linguagem[10] = "C Rocks!"; // O compilador adiciona o \\0 automaticamente
    
    printf("\\nTexto: %s\\n", linguagem);
    printf("Tamanho da string (strlen): %zu caracteres\\n", strlen(linguagem));

    return 0;
}
`,
      explanation:
        'A string "C Rocks!" tem 8 letras, mas ocupa 9 bytes na memória por causa do \\0 no final.',
    },
    challenge: {
      title: 'Desafio do Módulo 7: Encontrar o Maior Elemento',
      description:
        'Dado o array `int valores[5] = {12, 45, 8, 92, 33};`, encontre o maior valor contido nele usando um laço for e imprima o maior valor.',
      starterCode: `#include <stdio.h>

int main(void) {
    int valores[5] = {12, 45, 8, 92, 33};
    int maior = valores[0];

    // Percorra o array do indice 1 ate 4 e atualize a variavel 'maior'
    
    return 0;
}
`,
      hint: 'Faça `for (int i = 1; i < 5; i++) { if (valores[i] > maior) maior = valores[i]; }`',
      solutionCode: `#include <stdio.h>

int main(void) {
    int valores[5] = {12, 45, 8, 92, 33};
    int maior = valores[0];

    for (int i = 1; i < 5; i++) {
        if (valores[i] > maior) {
            maior = valores[i];
        }
    }

    printf("O maior valor do vetor e: %d\\n", maior);
    return 0;
}
`,
      expectedOutput: 'O maior valor do vetor e: 92\n',
    },
    keyTakeaways: [
      'Arrays começam no índice 0 e terminam em tamanho - 1.',
      'Strings em C são arrays de char terminados com \\0.',
      'Sempre reserve 1 byte a mais no array de char para caber o terminador nulo.',
    ],
  },
  {
    id: 'c-mod-8',
    moduleNumber: 8,
    title: 'Desmistificando Ponteiros sem Medo',
    subtitle: 'O operador de endereço &, o operador de desreferência * e a verdade sobre a memória',
    durationMinutes: 30,
    summary:
      'Perca o medo do tópico mais temido e mais poderoso de C. Entenda ponteiros de forma visual e simples.',
    theory: [
      'O que é um ponteiro? Um ponteiro é simplesmente uma variável cujo valor armazenado é um endereço de memória de outra variável.',
      'Dois operadores fundamentais para dominar:',
      '1. Operador de Endereço (`&`): "Me dê o endereço de onde esta variável mora". Se `x` vale 10 e mora no endereço `0x7FFE00`, `&x` vale `0x7FFE00`.',
      '2. Operador de Desreferência (`*`): "Vá até o endereço guardado neste ponteiro e acerte o valor que está lá dentro".',
      'Declaração: `int *ptr = &x;` significa "ptr é um ponteiro que aponta para um inteiro, e está guardando o endereço de x".',
      'Passagem por referência: com ponteiros, uma função pode modificar variáveis criadas na `main()` diretamente!',
    ],
    analogies: [
      'Imagine que a sua casa guarda um cofre com dinheiro (variável x = 1000). O papelzinho onde está escrito a sua rua e número é o PONTEIRO (&x). Se você der esse papel para alguém e disser "vá lá e coloque mais 500 reais dentro do cofre" (*ptr = 1500), quando você voltar para casa o cofre terá 1500 reais!',
    ],
    codeExample: {
      fileName: 'modulo8_ponteiros.c',
      code: `#include <stdio.h>

// Função que troca o valor de duas variáveis usando ponteiros!
void trocar(int *a, int *b) {
    int temp = *a; // Pega o valor apontado por a
    *a = *b;       // Grava o valor de b dentro da memória de a
    *b = temp;     // Grava o valor antigo de a dentro da memória de b
}

int main(void) {
    int x = 10;
    int y = 20;

    printf("Antes da troca: x = %d, y = %d\\n", x, y);

    // Passamos os endereços com &
    trocar(&x, &y);

    printf("Depois da troca: x = %d, y = %d\\n", x, y);

    return 0;
}
`,
      explanation:
        'Sem ponteiros, a função `trocar` alteraria apenas cópias locais e x e y na main continuariam iguais. Com ponteiros (*a e *b), ela mexe na memória real!',
    },
    challenge: {
      title: 'Desafio do Módulo 8: Dobrar Valor por Ponteiro',
      description:
        'Crie uma função `void dobrar(int *numero)` que multiplique por 2 o valor da variável apontada por ela. Na main, declare `int valor = 25;`, chame a função passando `&valor` e imprima o valor resultante (deve ser 50).',
      starterCode: `#include <stdio.h>

// Crie a funcao dobrar aqui

int main(void) {
    int valor = 25;
    // Chame a funcao e imprima o valor
    
    return 0;
}
`,
      hint: 'Dentro da função, use `*numero = (*numero) * 2;`',
      solutionCode: `#include <stdio.h>

void dobrar(int *numero) {
    *numero = (*numero) * 2;
}

int main(void) {
    int valor = 25;
    dobrar(&valor);
    printf("Valor dobrado: %d\\n", valor);
    return 0;
}
`,
      expectedOutput: 'Valor dobrado: 50\n',
    },
    keyTakeaways: [
      '&x obtém o endereço de memória de x.',
      '*ptr acessa o conteúdo daquele endereço de memória.',
      'Sempre inicialize ponteiros (com endereço ou com NULL) para evitar crashes.',
    ],
  },
  {
    id: 'c-mod-9',
    moduleNumber: 9,
    title: 'Alocação Dinâmica de Memória',
    subtitle: 'Stack vs Heap, malloc, calloc, realloc e a importância do free()',
    durationMinutes: 25,
    summary:
      'Aprenda a solicitar memória ao Sistema Operacional durante a execução do programa e devolva-a com responsabilidade para evitar vazamento de memória.',
    theory: [
      'A memória de um programa C é dividida em duas áreas principais:',
      '1. A Pilha (Stack): rápida e automática. Variáveis locais normais são criadas na Stack e liberadas automaticamente assim que a função termina.',
      '2. O Monte (Heap): área ampla de memória controlada manualmente por você. Se você precisa de um array cujo tamanho só é descoberto durante a execução, você pede memória no Heap!',
      '`malloc(tamanho_em_bytes)`: aloca um bloco no Heap. Ex: `int *vet = malloc(10 * sizeof(int));`.',
      'SEMPRE verifique se o ponteiro alocado não é `NULL` (caso o sistema esteja sem memória disponível).',
      'REGRA SAGRADA: Toda memória alocada com `malloc()` deve ser liberada com `free(ponteiro)` quando não for mais necessária! Não liberar causa vazamento de memória (Memory Leak).',
    ],
    analogies: [
      'A Stack é como post-its na sua mesa de trabalho: você anota rápido enquanto faz uma ligação e joga no lixo assim que desliga o telefone.',
      'O Heap é como alugar uma vaga de estacionamento: você solicita ao atendente (`malloc`), usa a vaga, e quando vai embora DEVE avisar a portaria (`free`). Se você nunca avisar, a vaga fica ocupada para sempre!',
    ],
    codeExample: {
      fileName: 'modulo9_malloc.c',
      code: `#include <stdio.h>
#include <stdlib.h> // Obrigatorio para malloc e free

int main(void) {
    int quantidade = 3;

    // Alocando espaco para 3 inteiros dinamicamente
    int *arrayDinamico = (int *)malloc(quantidade * sizeof(int));

    // Passo essencial de seguranca: verificar se a memoria foi concedida
    if (arrayDinamico == NULL) {
        printf("Erro fatal: sem memoria disponivel no sistema!\\n");
        return 1;
    }

    // Preenchendo o array
    for (int i = 0; i < quantidade; i++) {
        arrayDinamico[i] = (i + 1) * 100;
        printf("Elemento [%d] = %d\\n", i, arrayDinamico[i]);
    }

    // Liberando a memoria alocada (BOA PRATICA OBRIGATORIA!)
    free(arrayDinamico);
    arrayDinamico = NULL; // Evita ponteiro solto (dangling pointer)

    printf("Memoria liberada com sucesso!\\n");
    return 0;
}
`,
      explanation:
        'A função sizeof(int) calcula automaticamente quantos bytes um inteiro ocupa no processador (geralmente 4 bytes). Multiplicamos pelo número de itens.',
    },
    challenge: {
      title: 'Desafio do Módulo 9: Alocar e Somar',
      description:
        'Alocar dinamicamente um array de 4 números float com malloc, preencher com os valores 10.0, 20.0, 30.0, 40.0, somar todos eles e no final liberar com free().',
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    // 1. Alocar float *v com malloc
    // 2. Preencher e somar
    // 3. Imprimir a soma
    // 4. free(v)
    
    return 0;
}
`,
      hint: 'Use `float *v = malloc(4 * sizeof(float));` e lembre-se do `free(v);` no final.',
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    float *v = (float *)malloc(4 * sizeof(float));
    if (v == NULL) return 1;

    v[0] = 10.0f;
    v[1] = 20.0f;
    v[2] = 30.0f;
    v[3] = 40.0f;

    float soma = 0.0f;
    for (int i = 0; i < 4; i++) {
        soma += v[i];
    }

    printf("Soma total: %.1f\\n", soma);
    free(v);
    return 0;
}
`,
      expectedOutput: 'Soma total: 100.0\n',
    },
    keyTakeaways: [
      'Inclua <stdlib.h> para usar malloc e free.',
      'Sempre use sizeof(tipo) para calcular o tamanho de forma portável.',
      'Todo malloc() precisa de um free() correspondente.',
    ],
  },
  {
    id: 'c-mod-10',
    moduleNumber: 10,
    title: 'Estruturas (struct) e Novos Tipos de Dados',
    subtitle: 'Criando seus próprios tipos de dados complexos para modelar o mundo real',
    durationMinutes: 25,
    summary:
      'Aprenda a agrupar diferentes tipos de dados sob um mesmo teto com struct e simplifique seu código com typedef.',
    theory: [
      'Enquanto um vetor agrupa dados do mesmo tipo, uma `struct` (registro) permite agrupar variáveis de tipos totalmente diferentes em uma única estrutura.',
      'Por exemplo, para representar um Aluno precisamos de: nome (string), matrícula (int) e média (float). A struct reúne tudo isso.',
      'Acesso aos campos: se você tem uma variável comum de struct, usa o operador ponto (`aluno1.media = 9.5;`). Se você tem um ponteiro para struct, usa o operador seta (`ptrAluno->media = 9.5;`).',
      'O comando `typedef` permite dar um apelido amigável ao seu tipo, evitando ter que escrever `struct Aluno` toda vez.',
    ],
    analogies: [
      'Uma `struct` é como a ficha cadastral de um paciente no consultório médico: o papel contém campos de texto (nome), campos numéricos (idade, peso) e datas. Tudo em uma única pasta identificada.',
    ],
    codeExample: {
      fileName: 'modulo10_structs.c',
      code: `#include <stdio.h>
#include <string.h>

// Definindo o tipo Aluno com typedef e struct
typedef struct {
    char nome[50];
    int matricula;
    float media;
} Aluno;

// Funcao que imprime um aluno recebendo por ponteiro (eficiente em memoria!)
void imprimirAluno(const Aluno *a) {
    printf("=== Dados do Estudante ===\\n");
    printf("Nome:      %s\\n", a->nome);       // Operador seta -> para ponteiro
    printf("Matricula: %d\\n", a->matricula);
    printf("Media:     %.2f\\n", a->media);
}

int main(void) {
    Aluno a1;
    strcpy(a1.nome, "Lucas Ferreira");
    a1.matricula = 202601;
    a1.media = 9.4f;

    imprimirAluno(&a1);

    return 0;
}
`,
      explanation:
        'Passar a struct por ponteiro (const Aluno *a) evita fazer cópia de todos os 50 bytes da string e dos outros campos, tornando o programa extremamente veloz.',
    },
    challenge: {
      title: 'Desafio do Módulo 10: Modelando um Produto',
      description:
        'Crie uma struct `Produto` com os campos `codigo` (int), `nome` (char[30]) e `preco` (float). Crie uma variável dessa struct, preencha com dados e imprima formatado.',
      starterCode: `#include <stdio.h>
#include <string.h>

// Defina a struct Produto aqui

int main(void) {
    // Instancie e preencha o produto
    
    return 0;
}
`,
      hint: 'Use `strcpy(p.nome, "Teclado");` para atribuir o nome.',
      solutionCode: `#include <stdio.h>
#include <string.h>

typedef struct {
    int codigo;
    char nome[30];
    float preco;
} Produto;

int main(void) {
    Produto p;
    p.codigo = 101;
    strcpy(p.nome, "Teclado Mecanico");
    p.preco = 250.0f;

    printf("Produto #%d: %s - R$ %.2f\\n", p.codigo, p.nome, p.preco);
    return 0;
}
`,
      expectedOutput: 'Produto #101: Teclado Mecanico - R$ 250.00\n',
    },
    keyTakeaways: [
      'Use struct para modelar entidades complexas do mundo real.',
      'Operador ponto (.) para variáveis de struct.',
      'Operador seta (->) para ponteiros de struct.',
      'Use typedef para criar nomes de tipos mais limpos.',
    ],
  },
];

export const C_CHEAT_SHEET = {
  specifiers: [
    { spec: '%d / %i', type: 'int', desc: 'Inteiro com sinal (ex: 42, -5)' },
    { spec: '%u', type: 'unsigned int', desc: 'Inteiro sem sinal (apenas positivos)' },
    { spec: '%f', type: 'float / double', desc: 'Decimal de ponto flutuante (ex: 3.1415)' },
    { spec: '%.2f', type: 'float / double', desc: 'Decimal formatado com 2 casas decimais' },
    { spec: '%lf', type: 'double', desc: 'Ponto flutuante de precisão dupla (em scanf)' },
    { spec: '%c', type: 'char', desc: 'Um único caractere entre aspas simples (ex: \'A\')' },
    { spec: '%s', type: 'char[] (string)', desc: 'Sequência de caracteres terminada em \\0' },
    { spec: '%p', type: 'void *', desc: 'Endereço físico de memória RAM (ex: 0x7ffd98)' },
    { spec: '%x / %X', type: 'int', desc: 'Representação hexadecimal (base 16)' },
    { spec: '%%', type: 'literal', desc: 'Imprime o caractere de porcentagem literal %' },
  ],
  dataTypes: [
    { type: 'char', bytes: 1, range: '-128 a 127 ou 0 a 255', desc: 'Um caractere ou byte' },
    { type: 'short', bytes: 2, range: '-32.768 a 32.767', desc: 'Inteiro curto' },
    { type: 'int', bytes: 4, range: '-2.147.483.648 a 2.147.483.647', desc: 'Inteiro padrão de 32 bits' },
    { type: 'long long', bytes: 8, range: '-9.223.372.036.854.775.808 a 9 quintilhões', desc: 'Inteiro de 64 bits para números gigantes' },
    { type: 'float', bytes: 4, range: '~6 a 7 dígitos de precisão', desc: 'Decimal precisão simples' },
    { type: 'double', bytes: 8, range: '~15 a 17 dígitos de precisão', desc: 'Decimal alta precisão científica' },
    { type: 'ponteiro (*)', bytes: 8, range: 'Espaço de endereçamento de 64 bits', desc: 'Endereço de memória física' },
  ],
  escapeSequences: [
    { code: '\\n', desc: 'Quebra de linha (New line) - vai para o início da linha seguinte' },
    { code: '\\t', desc: 'Tabulação horizontal (Tab) - recuo de 4 ou 8 espaços' },
    { code: '\\\\', desc: 'Barra invertida literal \\' },
    { code: '\\"', desc: 'Aspas duplas literais "' },
    { code: '\\0', desc: 'Caractere nulo terminador de string (código ASCII 0)' },
  ],
  standardLibraries: [
    {
      header: '<stdio.h>',
      purpose: 'Entrada e saída padrão',
      commonFunctions: 'printf, scanf, getchar, putchar, fopen, fclose, fgets, sprintf',
    },
    {
      header: '<stdlib.h>',
      purpose: 'Gerenciamento de memória e utilitários',
      commonFunctions: 'malloc, calloc, realloc, free, exit, rand, srand, atoi, atof, abs',
    },
    {
      header: '<string.h>',
      purpose: 'Manipulação de arrays de texto',
      commonFunctions: 'strlen, strcpy, strncpy, strcat, strcmp, strncmp, strchr, strstr, memcpy',
    },
    {
      header: '<math.h>',
      purpose: 'Operações matemáticas avançadas',
      commonFunctions: 'sqrt, pow, sin, cos, tan, log, exp, ceil, floor, fabs',
    },
    {
      header: '<stdbool.h>',
      purpose: 'Tipo booleano moderno (C99+)',
      commonFunctions: 'bool, true, false',
    },
    {
      header: '<ctype.h>',
      purpose: 'Verificação e conversão de caracteres',
      commonFunctions: 'isalpha, isdigit, isalnum, isspace, tolower, toupper',
    },
  ],
};
