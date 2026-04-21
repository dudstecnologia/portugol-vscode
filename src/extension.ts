// src/extension.ts
import * as vscode from 'vscode';
import { Lexer } from './interpreter/lexer';
import { Parser } from './interpreter/parser';
import { Interpreter, InterpreterIO } from './interpreter/interpreter';
import { PortugolCompletionProvider } from './providers/completionProvider';
import { PortugolFormattingProvider } from './providers/formattingProvider';
import { VariablesPanel } from './panels/variablesPanel';

let terminal: vscode.Terminal | undefined;
let currentInterpreter: Interpreter | undefined;
let variablesPanel: VariablesPanel | undefined;
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('Extensão Portugol ativada!');

  // Coleção de diagnósticos (erros sublinhados no editor)
  diagnosticCollection = vscode.languages.createDiagnosticCollection('portugol');
  context.subscriptions.push(diagnosticCollection);

  // Painel de variáveis
  variablesPanel = new VariablesPanel();

  // Formatador
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { language: 'portugol' },
      new PortugolFormattingProvider()
    )
  );

  // Autocomplete
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'portugol' },
      new PortugolCompletionProvider(),
      ...('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZÀ-ú'.split(''))
    )
  );

  // Diagnóstico em tempo real (ao salvar ou ao editar)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.languageId === 'portugol') {
        validateDocument(event.document);
      }
    }),
    vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'portugol') validateDocument(doc);
    })
  );

  // Comandos
  context.subscriptions.push(
    vscode.commands.registerCommand('portugol.run', () => runAlgorithm(context)),
    vscode.commands.registerCommand('portugol.stop', () => stopAlgorithm()),
    vscode.commands.registerCommand('portugol.showVariables', () => {
      variablesPanel?.show(context);
    })
  );

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(play) Executar (F5)';
  statusBar.command = 'portugol.run';
  statusBar.tooltip = 'Executar algoritmo Portugol';
  context.subscriptions.push(statusBar);

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor?.document.languageId === 'portugol') {
      statusBar.show();
    } else {
      statusBar.hide();
    }
  });

  if (vscode.window.activeTextEditor?.document.languageId === 'portugol') {
    statusBar.show();
  }
}

// ─── Validação (diagnósticos) ──────────────────────────────────────────────

function validateDocument(document: vscode.TextDocument) {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();

  try {
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    parser.parse();
    diagnosticCollection.set(document.uri, []);
  } catch (err: any) {
    const message = err.message || 'Erro de sintaxe';
    const lineMatch = message.match(/\[Linha (\d+)\]/);
    const line = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;

    const range = new vscode.Range(
      new vscode.Position(Math.max(0, line), 0),
      new vscode.Position(Math.max(0, line), 999)
    );

    diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
    diagnosticCollection.set(document.uri, diagnostics);
  }
}

// ─── Execução ──────────────────────────────────────────────────────────────

async function runAlgorithm(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'portugol') {
    vscode.window.showWarningMessage('Abra um arquivo .alg para executar!');
    return;
  }

  await editor.document.save();
  const code = editor.document.getText();

  // Mostrar painel de variáveis
  variablesPanel?.show(context);

  // Criar/reutilizar terminal
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({
      name: 'Portugol',
      isTransient: false,
    });
  }
  terminal.show(true);

  // Fila de inputs do usuário
  const inputQueue: string[] = [];
  const inputResolvers: ((value: string) => void)[] = [];

  // Capturar inputs via InputBox
  async function readInput(): Promise<string> {
    return new Promise(resolve => {
      vscode.window.showInputBox({
        prompt: 'Digite um valor:',
        placeHolder: 'Pressione Enter para confirmar',
        ignoreFocusOut: true,
      }).then(value => {
        const input = value ?? '';
        if (process.platform === 'win32') {
          const escaped = input.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
          terminal?.sendText(`Write-Host "  -> ${escaped}"`, true);
        } else {
          const escaped = input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
          terminal?.sendText(`printf "  -> %s\\n" "${escaped}"`, true);
        }
        resolve(input);
      });
    });
  }

  const isWindows = process.platform === 'win32';

  function escapeForTerminal(text: string): string {
    if (isWindows) {
      return text.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
    } else {
      return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    }
  }

  const io: InterpreterIO = {
    write: (text: string) => {
      const escaped = escapeForTerminal(text);
      if (isWindows) {
        terminal?.sendText(`Write-Host -NoNewline "${escaped}"`, true);
      } else {
        terminal?.sendText(`printf "%s" "${escaped}"`, true);
      }
    },
    writeln: (text: string) => {
      const escaped = escapeForTerminal(text);
      if (isWindows) {
        terminal?.sendText(`Write-Host "${escaped}"`, true);
      } else {
        terminal?.sendText(`printf "%s\\n" "${escaped}"`, true);
      }
    },
    read: readInput,
    clear: () => {
      vscode.commands.executeCommand('workbench.action.terminal.clear');
    },
    onVariablesUpdate: (vars) => {
      variablesPanel?.update(vars);
    },
  };

  try {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    currentInterpreter = new Interpreter(io);

    terminal.sendText('echo ""', true);
    terminal.sendText(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`, true);
    terminal.sendText(`echo "    Algoritmo: ${ast.name}"`, true);
    terminal.sendText(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`, true);
    terminal.sendText('echo ""', true);

    await currentInterpreter.run(ast);

    terminal.sendText('echo ""', true);
    terminal.sendText(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`, true);
    terminal.sendText(`echo "    Execução concluída"`, true);
    terminal.sendText(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`, true);

  } catch (err: any) {
    const msg = err.message || 'Erro desconhecido';
    terminal.sendText('echo ""', true);
    terminal.sendText(`echo "ERRO: ${msg}"`, true);
    vscode.window.showErrorMessage(`Erro ao executar: ${msg}`);
  } finally {
    currentInterpreter = undefined;
  }
}

function stopAlgorithm() {
  if (currentInterpreter) {
    currentInterpreter.stop();
    currentInterpreter = undefined;
    vscode.window.showInformationMessage('Execução interrompida.');
  }
}

export function deactivate() {
  terminal?.dispose();
  variablesPanel?.dispose();
  diagnosticCollection.clear();
}
