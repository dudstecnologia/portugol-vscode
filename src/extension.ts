// src/extension.ts
import * as vscode from 'vscode';
import { Lexer } from './interpreter/lexer';
import { Parser } from './interpreter/parser';
import { Interpreter, InterpreterIO } from './interpreter/interpreter';
import { PortugolCompletionProvider } from './providers/completionProvider';
import { PortugolFormattingProvider } from './providers/formattingProvider';
import { VariablesPanel } from './panels/variablesPanel';
import { PortugolPty } from './terminal/portugolPty';

let currentTerminal: vscode.Terminal | undefined;
let currentPty: PortugolPty | undefined;
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

    diagnosticCollection.set(document.uri, [
      new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error)
    ]);
  }
}

// ─── Execução ──────────────────────────────────────────────────────────────

async function runAlgorithm(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'portugol') {
    vscode.window.showWarningMessage('Abra um arquivo .alg para executar!');
    return;
  }

  // Parar execução anterior, se houver
  if (currentInterpreter) {
    currentPty?.stop();
    currentInterpreter.stop();
    currentInterpreter = undefined;
  }

  await editor.document.save();
  const code = editor.document.getText();

  variablesPanel?.show(context);

  // Criar novo PTY e terminal para esta execução
  currentPty?.dispose();
  currentTerminal?.dispose();

  const pty = new PortugolPty();
  currentPty = pty;
  currentTerminal = vscode.window.createTerminal({ name: 'Portugol', pty });
  currentTerminal.show(true);

  const io: InterpreterIO = {
    write: (text) => pty.write(text),
    writeln: (text) => pty.writeln(text),
    read: () => pty.read(),
    clear: () => pty.clear(),
    onVariablesUpdate: (vars) => variablesPanel?.update(vars),
  };

  try {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    currentInterpreter = new Interpreter(io);

    await pty.ready;

    pty.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    pty.writeln(`    Algoritmo: ${ast.name}`);
    pty.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    pty.writeln('');

    await currentInterpreter.run(ast);

    pty.writeln('');
    pty.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    pty.writeln('    Execução concluída');
    pty.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err: any) {
    const msg = err.message || 'Erro desconhecido';
    if (!msg.includes('interrompida')) {
      pty.writeln('');
      pty.writeln(`ERRO: ${msg}`);
      vscode.window.showErrorMessage(`Erro ao executar: ${msg}`);
    }
  } finally {
    currentInterpreter = undefined;
  }
}

function stopAlgorithm() {
  currentPty?.stop();
  if (currentInterpreter) {
    currentInterpreter.stop();
    currentInterpreter = undefined;
    vscode.window.showInformationMessage('Execução interrompida.');
  }
}

export function deactivate() {
  currentPty?.dispose();
  currentTerminal?.dispose();
  variablesPanel?.dispose();
  diagnosticCollection.clear();
}
