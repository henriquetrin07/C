import { ExampleTemplate } from '../types';

export const EXAMPLES: ExampleTemplate[] = [
  {
    id: 'hello-world',
    title: '1. Olá, Mundo!',
    description: 'Programa clássico para testar a saída padrão (stdout) e a função printf.',
    category: 'Iniciante',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>

int main(void) {
    printf("=======================================\\n");
    printf("  Bem-vindo ao Compilador C no Navegador! \\n");
    printf("=======================================\\n");
    printf("Compilado com sucesso via GCC/TCC.\\n");
    printf("Você pode alterar o código e clicar em Executar!\\n");
    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'interactive-scanf',
    title: '2. Entrada Padrão (scanf interativo)',
    description: 'Demonstra a leitura de dados do usuário via stdin com scanf e cálculos aritméticos.',
    category: 'Iniciante',
    stdin: '25 17',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>

int main(void) {
    int num1, num2;

    printf("Digite dois números inteiros (separados por espaço):\\n");
    
    // Leitura a partir da aba 'Entrada (stdin)'
    if (scanf("%d %d", &num1, &num2) == 2) {
        printf("Primeiro número: %d\\n", num1);
        printf("Segundo número : %d\\n", num2);
        printf("-------------------------\\n");
        printf("Soma           : %d\\n", num1 + num2);
        printf("Subtração      : %d\\n", num1 - num2);
        printf("Multiplicação  : %d\\n", num1 * num2);
        if (num2 != 0) {
            printf("Divisão inteira: %d (resto %d)\\n", num1 / num2, num1 % num2);
            printf("Divisão real   : %.2f\\n", (float)num1 / num2);
        } else {
            printf("Divisão por zero não é permitida!\\n");
        }
    } else {
        printf("Erro na leitura! Certifique-se de preencher a aba 'Entrada (stdin)'.\\n");
    }

    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'pointers-references',
    title: '3. Ponteiros & Passagem por Referência',
    description: 'Explora ponteiros, operadores & (endereço) e * (desreferenciamento), e troca de valores (swap).',
    category: 'Intermediário',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>

// Função que troca os valores de duas variáveis usando ponteiros
void trocar(int *ptr_a, int *ptr_b) {
    int temp = *ptr_a;
    *ptr_a = *ptr_b;
    *ptr_b = temp;
}

int main(void) {
    int x = 100;
    int y = 500;

    printf("--- Antes da Troca ---\\n");
    printf("x = %d (endereço de memória: %p)\\n", x, (void*)&x);
    printf("y = %d (endereço de memória: %p)\\n", y, (void*)&y);

    // Passagem dos endereços de memória
    trocar(&x, &y);

    printf("\\n--- Após trocar(&x, &y) ---\\n");
    printf("x = %d (agora com o valor que era de y)\\n", x);
    printf("y = %d (agora com o valor que era de x)\\n", y);

    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'dynamic-memory',
    title: '4. Alocação Dinâmica (malloc e free)',
    description: 'Aloca memória no heap dinamicamente, verifica ponteiros e libera com free().',
    category: 'Intermediário',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 8;
    printf("Alocando array de %d inteiros no heap via malloc()...\\n", n);

    // Alocação dinâmica de memória
    int *vetor = (int *)malloc(n * sizeof(int));

    // Verificação de segurança obrigatória em C
    if (vetor == NULL) {
        fprintf(stderr, "Falha ao alocar memória!\\n");
        return 1;
    }

    // Preenche com potências de 2
    for (int i = 0; i < n; i++) {
        vetor[i] = 1 << i; // 2^i
    }

    printf("Valores calculados:\\n");
    for (int i = 0; i < n; i++) {
        printf("  vetor[%d] = %4d (no endereço %p)\\n", i, vetor[i], (void*)&vetor[i]);
    }

    // Liberação segura da memória
    free(vetor);
    vetor = NULL;

    printf("Memória desalocada com sucesso com free()!\\n");
    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'linked-list',
    title: '5. Estrutura de Dados: Lista Encadeada',
    description: 'Criação de nós com struct, inserção no início, travessia e limpeza da lista.',
    category: 'Avançado',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>
#include <stdlib.h>

// Definição do nó da lista
typedef struct Node {
    int valor;
    struct Node *proximo;
} Node;

// Inserir elemento no início da lista
void inserir_inicio(Node **cabeca, int valor) {
    Node *novo = (Node *)malloc(sizeof(Node));
    if (!novo) {
        fprintf(stderr, "Erro de memória\\n");
        exit(1);
    }
    novo->valor = valor;
    novo->proximo = *cabeca;
    *cabeca = novo;
}

// Imprimir todos os elementos da lista
void imprimir_lista(Node *cabeca) {
    printf("Lista: ");
    Node *atual = cabeca;
    while (atual != NULL) {
        printf("[%d] -> ", atual->valor);
        atual = atual->proximo;
    }
    printf("NULL\\n");
}

// Liberar toda a memória da lista
void liberar_lista(Node *cabeca) {
    Node *atual = cabeca;
    while (atual != NULL) {
        Node *temp = atual->proximo;
        free(atual);
        atual = temp;
    }
}

int main(void) {
    Node *lista = NULL;

    printf("Inserindo elementos na lista encadeada...\\n");
    inserir_inicio(&lista, 10);
    inserir_inicio(&lista, 20);
    inserir_inicio(&lista, 30);
    inserir_inicio(&lista, 40);

    imprimir_lista(lista);

    liberar_lista(lista);
    printf("Lista liberada com sucesso.\\n");

    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'quicksort',
    title: '6. Algoritmo: QuickSort Recursivo',
    description: 'Implementação clássica do algoritmo de ordenação rápida com particionamento de Hoare/Lomuto.',
    category: 'Algoritmos',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int particionar(int arr[], int baixo, int alto) {
    int pivo = arr[alto];
    int i = (baixo - 1);

    for (int j = baixo; j <= alto - 1; j++) {
        if (arr[j] < pivo) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[alto]);
    return (i + 1);
}

void quicksort(int arr[], int baixo, int alto) {
    if (baixo < alto) {
        int pi = particionar(arr, baixo, alto);
        quicksort(arr, baixo, pi - 1);
        quicksort(arr, pi + 1, alto);
    }
}

void print_array(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
}

int main(void) {
    int dados[] = {64, 25, 12, 22, 11, 90, 45, 78, 3, 56};
    int n = sizeof(dados) / sizeof(dados[0]);

    printf("Array original:\\n  ");
    print_array(dados, n);

    quicksort(dados, 0, n - 1);

    printf("\\nArray ordenado com QuickSort:\\n  ");
    print_array(dados, n);

    return 0;
}
`,
        isMain: true,
      },
    ],
  },
  {
    id: 'multi-file-project',
    title: '7. Projeto Multi-Arquivo (.c e .h)',
    description: 'Mostra a organização em múltiplos arquivos usando cabeçalho header (.h) e implementação (.c).',
    category: 'Avançado',
    files: [
      {
        id: 'f1',
        name: 'main.c',
        content: `#include <stdio.h>
#include "operacoes.h"

int main(void) {
    int a = 12;
    int b = 4;

    printf("=== Testando Módulos Multi-Arquivo em C ===\\n");
    printf("Soma (%d + %d)          = %d\\n", a, b, somar(a, b));
    printf("Subtração (%d - %d)     = %d\\n", a, b, subtrair(a, b));
    printf("Multiplicação (%d * %d) = %d\\n", a, b, multiplicar(a, b));
    printf("Fatorial de %d          = %ld\\n", b, fatorial(b));

    return 0;
}
`,
        isMain: true,
      },
      {
        id: 'f2',
        name: 'operacoes.h',
        content: `#ifndef OPERACOES_H
#define OPERACOES_H

// Declarações das funções (interface pública)
int somar(int a, int b);
int subtrair(int a, int b);
int multiplicar(int a, int b);
long fatorial(int n);

#endif // OPERACOES_H
`,
      },
      {
        id: 'f3',
        name: 'operacoes.c',
        content: `#include "operacoes.h"

int somar(int a, int b) {
    return a + b;
}

int subtrair(int a, int b) {
    return a - b;
}

int multiplicar(int a, int b) {
    return a * b;
}

long fatorial(int n) {
    if (n <= 1) return 1;
    long res = 1;
    for (int i = 2; i <= n; i++) {
        res *= i;
    }
    return res;
}
`,
      },
    ],
  },
];
