// src/panels/variablesPanel.ts
import * as vscode from 'vscode';

export class VariablesPanel {
  private panel?: vscode.WebviewPanel;

  show(context: vscode.ExtensionContext) {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'portugolVariables',
      'Variáveis - Portugol',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.webview.html = this.getHtml({});
    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  update(vars: Record<string, any>) {
    if (this.panel) {
      this.panel.webview.html = this.getHtml(vars);
    }
  }

  dispose() {
    this.panel?.dispose();
    this.panel = undefined;
  }

  private getHtml(vars: Record<string, any>): string {
    const rows = Object.entries(vars).map(([name, value]) => {
      const type = this.getType(value);
      const display = this.displayValue(value);
      return `
        <tr>
          <td class="name">${name}</td>
          <td class="type">${type}</td>
          <td class="value">${display}</td>
        </tr>`;
    }).join('');

    const empty = Object.keys(vars).length === 0;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Variáveis</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Consolas', 'Courier New', monospace;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    padding: 16px;
    font-size: 13px;
  }
  h2 {
    font-size: 14px;
    margin-bottom: 16px;
    color: var(--vscode-textLink-foreground);
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 11px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead th {
    text-align: left;
    padding: 6px 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-widget-border, #444);
  }
  tr:hover td { background: var(--vscode-list-hoverBackground); }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--vscode-widget-border, #333);
    vertical-align: middle;
  }
  .name { color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); font-weight: 600; }
  .type {
    color: var(--vscode-symbolIcon-typeParameterForeground, #4ec9b0);
    font-size: 11px;
    font-style: italic;
  }
  .value { color: var(--vscode-debugTokenExpression-value, #ce9178); }
  .empty {
    text-align: center;
    padding: 40px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
  }
  .empty-icon { font-size: 32px; margin-bottom: 8px; }
</style>
</head>
<body>
  <h2>Variáveis <span class="badge">${Object.keys(vars).length}</span></h2>
  ${empty
    ? `<div class="empty">Execute o algoritmo para ver as variáveis</div>`
    : `<table>
        <thead><tr><th>Nome</th><th>Tipo</th><th>Valor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }
</body>
</html>`;
  }

  private getType(value: any): string {
    if (typeof value === 'number') return Number.isInteger(value) ? 'inteiro' : 'real';
    if (typeof value === 'string') return 'caractere';
    if (typeof value === 'boolean') return 'lógico';
    if (typeof value === 'object' && value !== null) return 'vetor';
    return 'desconhecido';
  }

  private displayValue(value: any): string {
    if (value === null || value === undefined) return 'nulo';
    if (typeof value === 'boolean') return value ? 'Verdadeiro' : 'Falso';
    if (typeof value === 'object') return '[vetor]';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return String(value);
      return value.toFixed(4).replace(/\.?0+$/, '');
    }
    return `"${value}"`;
  }
}
