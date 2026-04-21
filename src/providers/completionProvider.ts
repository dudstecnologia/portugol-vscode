// src/providers/completionProvider.ts
import * as vscode from 'vscode';

const KEYWORDS = [
  'algoritmo', 'fimalgoritmo', 'var', 'inicio', 'fim',
  'inteiro', 'real', 'caractere', 'logico', 'vetor',
  'se', 'entao', 'senao', 'fimse',
  'enquanto', 'faca', 'fimenquanto',
  'para', 'de', 'ate', 'fimpara',
  'repita', 'escolha', 'caso', 'outrocaso', 'fimescolha',
  'procedimento', 'fimprocedimento', 'funcao', 'fimfuncao',
  'retorne', 'interrompa', 'verdadeiro', 'falso',
  'e', 'ou', 'nao', 'xou',
];

const BUILTIN_FUNCTIONS = [
  { name: 'escreva', detail: 'escreva(valor)', doc: 'Escreve na tela sem quebra de linha.' },
  { name: 'escreval', detail: 'escreval(valor)', doc: 'Escreve na tela com quebra de linha.' },
  { name: 'leia', detail: 'leia(variavel)', doc: 'Lê um valor digitado pelo usuário.' },
  { name: 'abs', detail: 'abs(numero)', doc: 'Retorna o valor absoluto.' },
  { name: 'arredonda', detail: 'arredonda(numero, casas)', doc: 'Arredonda para N casas decimais.' },
  { name: 'trunca', detail: 'trunca(numero)', doc: 'Remove a parte decimal.' },
  { name: 'raizq', detail: 'raizq(numero)', doc: 'Raiz quadrada.' },
  { name: 'potencia', detail: 'potencia(base, exp)', doc: 'Potenciação.' },
  { name: 'aleatorio', detail: 'aleatorio(min, max)', doc: 'Número aleatório entre min e max.' },
  { name: 'compr', detail: 'compr(texto)', doc: 'Comprimento de um texto.' },
  { name: 'copia', detail: 'copia(texto, inicio, tamanho)', doc: 'Copia parte de um texto.' },
  { name: 'maiuscula', detail: 'maiuscula(texto)', doc: 'Converte para maiúsculas.' },
  { name: 'minuscula', detail: 'minuscula(texto)', doc: 'Converte para minúsculas.' },
  { name: 'asc', detail: 'asc(caractere)', doc: 'Código ASCII do caractere.' },
  { name: 'carac', detail: 'carac(codigo)', doc: 'Caractere do código ASCII.' },
  { name: 'sen', detail: 'sen(angulo)', doc: 'Seno (em graus).' },
  { name: 'cos', detail: 'cos(angulo)', doc: 'Cosseno (em graus).' },
  { name: 'tan', detail: 'tan(angulo)', doc: 'Tangente (em graus).' },
  { name: 'int', detail: 'int(numero)', doc: 'Converte para inteiro.' },
  { name: 'real', detail: 'real(numero)', doc: 'Converte para real.' },
  { name: 'mod', detail: 'mod(a, b)', doc: 'Resto da divisão.' },
  { name: 'div', detail: 'div(a, b)', doc: 'Divisão inteira.' },
  { name: 'limpatela', detail: 'limpatela()', doc: 'Limpa a tela.' },
  { name: 'hora', detail: 'hora()', doc: 'Hora atual.' },
  { name: 'hoje', detail: 'hoje()', doc: 'Data atual.' },
  { name: 'log', detail: 'log(numero)', doc: 'Logaritmo na base 10.' },
  { name: 'logn', detail: 'logn(numero)', doc: 'Logaritmo natural.' },
  { name: 'exp', detail: 'exp(numero)', doc: 'Exponencial e^x.' },
  { name: 'pi', detail: 'pi()', doc: 'Retorna o valor de π.' },
];

export class PortugolCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // Keywords
    for (const kw of KEYWORDS) {
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
      item.detail = 'Palavra-chave Portugol';
      items.push(item);
    }

    // Built-in functions
    for (const fn of BUILTIN_FUNCTIONS) {
      const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
      item.detail = fn.detail;
      item.documentation = new vscode.MarkdownString(fn.doc);
      items.push(item);
    }

    // User-declared variables from the document
    const text = document.getText();
    const varRegex = /\b([a-zA-ZÀ-ú_][a-zA-ZÀ-ú0-9_]*)\s*:/g;
    let match;
    while ((match = varRegex.exec(text)) !== null) {
      const varName = match[1];
      if (!KEYWORDS.includes(varName.toLowerCase())) {
        const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
        item.detail = 'Variável local';
        items.push(item);
      }
    }

    return items;
  }
}
