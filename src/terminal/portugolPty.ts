// src/terminal/portugolPty.ts
import * as vscode from 'vscode';

export class PortugolPty implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite = this.writeEmitter.event;

  private inputBuffer = '';
  private pendingRead: ((value: string) => void) | null = null;
  private pendingReject: ((reason: any) => void) | null = null;

  private openResolve!: () => void;
  readonly ready: Promise<void> = new Promise(resolve => { this.openResolve = resolve; });

  open(): void {
    this.openResolve();
  }

  close(): void {
    this.rejectPending(new Error('Execução interrompida pelo usuário.'));
  }

  handleInput(data: string): void {
    let i = 0;
    while (i < data.length) {
      const char = data[i];
      const code = char.charCodeAt(0);

      if (char === '\x1b') {
        // Sequência de escape ANSI (ex: setas do teclado) — ignorar
        i++;
        if (i < data.length && data[i] === '[') {
          i++;
          while (i < data.length && !/[A-Za-z]/.test(data[i])) { i++; }
        }
        i++;
        continue;
      }

      if (char === '\r' || char === '\n') {
        this.writeEmitter.fire('\r\n');
        const line = this.inputBuffer;
        this.inputBuffer = '';
        if (this.pendingRead) {
          const resolve = this.pendingRead;
          this.pendingRead = null;
          this.pendingReject = null;
          resolve(line);
        }
      } else if (char === '\x7f' || char === '\b') {
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.writeEmitter.fire('\b \b');
        }
      } else if (char === '\x03') {
        // Ctrl+C
        this.stop();
      } else if (code >= 0x20) {
        this.inputBuffer += char;
        this.writeEmitter.fire(char);
      }

      i++;
    }
  }

  read(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingRead = resolve;
      this.pendingReject = reject;
    });
  }

  write(text: string): void {
    this.writeEmitter.fire(text.replace(/\n/g, '\r\n'));
  }

  writeln(text: string): void {
    this.writeEmitter.fire(text.replace(/\n/g, '\r\n') + '\r\n');
  }

  clear(): void {
    this.writeEmitter.fire('\x1b[2J\x1b[3J\x1b[H');
  }

  stop(): void {
    this.inputBuffer = '';
    this.rejectPending(new Error('Execução interrompida pelo usuário.'));
  }

  dispose(): void {
    this.rejectPending(new Error('Execução interrompida pelo usuário.'));
    this.writeEmitter.dispose();
  }

  private rejectPending(err: Error): void {
    if (this.pendingReject) {
      const reject = this.pendingReject;
      this.pendingRead = null;
      this.pendingReject = null;
      reject(err);
    }
  }
}
