// src/providers/formattingProvider.ts
import * as vscode from 'vscode';

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[ãâá]/g, 'a').replace(/ç/g, 'c')
    .replace(/[éê]/g, 'e').replace(/í/g, 'i')
    .replace(/[óô]/g, 'o').replace(/ú/g, 'u');
}

export class PortugolFormattingProvider implements vscode.DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    const tab = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    const lines: string[] = [];
    let indent = 0;
    // Pilha que guarda o nível de indent onde cada 'escolha' foi aberto
    const escolhaStack: number[] = [];

    for (let i = 0; i < document.lineCount; i++) {
      const trimmed = document.lineAt(i).text.trim();

      if (trimmed === '') {
        lines.push('');
        continue;
      }

      const norm = normalize(trimmed);

      // ── Diminuir indent ANTES de renderizar a linha ──────────────────────

      if (/^fimalgoritmo\b/.test(norm)) {
        indent = 0;

      } else if (/^(fimse|fimenquanto|fimpara|fimprocedimento|fimfuncao)\b/.test(norm)) {
        indent = Math.max(0, indent - 1);

      } else if (/^fimescolha\b/.test(norm)) {
        // Volta para o nível em que 'escolha' foi aberto
        indent = escolhaStack.length > 0 ? escolhaStack.pop()! : Math.max(0, indent - 2);

      } else if (/^(senao|outrocaso)\b/.test(norm)) {
        indent = Math.max(0, indent - 1);

      } else if (/^caso\b/.test(norm)) {
        // Sempre posiciona em escolha_level + 1 (funciona para 1º e demais casos)
        indent = escolhaStack.length > 0
          ? escolhaStack[escolhaStack.length - 1] + 1
          : Math.max(0, indent - 1);

      } else if (/^ate\b/.test(norm)) {
        // Fechamento do 'repita' (linha que começa com 'ate condição')
        indent = Math.max(0, indent - 1);
      }

      lines.push(tab.repeat(indent) + trimmed);

      // ── Aumentar indent APÓS renderizar a linha ───────────────────────────

      if (/^inicio\b/.test(norm)) {
        indent++;
      } else if (/\b(entao|faca)$/.test(norm)) {
        // se...entao  /  enquanto...faca  /  para...faca
        indent++;
      } else if (/^(senao|outrocaso)\b/.test(norm)) {
        indent++;
      } else if (/^caso\b/.test(norm)) {
        indent++;
      } else if (/^repita$/.test(norm)) {
        indent++;
      } else if (/^escolha\b/.test(norm)) {
        escolhaStack.push(indent);
        indent++;
      }
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );

    return [vscode.TextEdit.replace(fullRange, lines.join('\n'))];
  }
}
