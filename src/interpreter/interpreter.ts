// src/interpreter/interpreter.ts
import {
  Node, ProgramNode, VarDeclNode, AssignNode, WriteNode, ReadNode,
  IfNode, WhileNode, ForNode, RepeatNode, SwitchNode,
  BinaryOpNode, UnaryOpNode, IdentifierNode, LiteralNode,
  ArrayAccessNode, FunctionCallNode, ProcedureDeclNode, FunctionDeclNode,
  ReturnNode, BreakNode, ContinueNode, ProcedureCallNode
} from './parser';

// ─── Sinais de controle de fluxo ──────────────────────────────────────────

class ReturnSignal { constructor(public value: any) {} }
class BreakSignal {}
class ContinueSignal {}

// ─── Ambiente de variáveis ─────────────────────────────────────────────────

export class Environment {
  private vars: Map<string, any> = new Map();
  private parent?: Environment;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  get(name: string): any {
    const key = name.toLowerCase();
    if (this.vars.has(key)) return this.vars.get(key);
    if (this.parent) return this.parent.get(name);
    throw new Error(`Variável não declarada: '${name}'`);
  }

  set(name: string, value: any) {
    const key = name.toLowerCase();
    if (this.vars.has(key)) {
      this.vars.set(key, value);
      return;
    }
    if (this.parent && this.parent.has(key)) {
      this.parent.set(name, value);
      return;
    }
    this.vars.set(key, value);
  }

  define(name: string, value: any) {
    this.vars.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    const key = name.toLowerCase();
    return this.vars.has(key) || (this.parent?.has(key) ?? false);
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of this.vars) result[key] = val;
    return result;
  }
}

// ─── Callbacks de I/O ─────────────────────────────────────────────────────

export interface InterpreterIO {
  write: (text: string) => void;
  writeln: (text: string) => void;
  read: () => Promise<string>;
  clear: () => void;
  onVariablesUpdate?: (vars: Record<string, any>) => void;
}

// ─── Interpretador Principal ───────────────────────────────────────────────

export class Interpreter {
  private io: InterpreterIO;
  private globalEnv: Environment;
  private functions: Map<string, FunctionDeclNode | ProcedureDeclNode> = new Map();
  private stopped = false;

  constructor(io: InterpreterIO) {
    this.io = io;
    this.globalEnv = new Environment();
  }

  stop() { this.stopped = true; }

  async run(program: ProgramNode) {
    this.stopped = false;
    this.globalEnv = new Environment();

    // Registrar funções e procedimentos
    for (const fn of program.functions) {
      this.functions.set(fn.name.toLowerCase(), fn);
    }

    // Declarar variáveis globais
    this.declareVars(program.vars, this.globalEnv);

    // Executar corpo principal
    await this.execBlock(program.body, this.globalEnv);
  }

  private declareVars(vars: VarDeclNode[], env: Environment) {
    for (const decl of vars) {
      for (const name of decl.names) {
        let defaultVal: any;
        if (decl.arrayDims) {
          defaultVal = this.createArray(decl.arrayDims, decl.type);
        } else {
          defaultVal = this.defaultValue(decl.type);
        }
        env.define(name, defaultVal);
      }
    }
  }

  private defaultValue(type: string): any {
    switch (type.toLowerCase()) {
      case 'inteiro': return 0;
      case 'real': return 0.0;
      case 'caractere': case 'caracter': return '';
      case 'logico': case 'lógico': return false;
      default: return null;
    }
  }

  private createArray(dims: [number, number][], type: string): any {
    if (dims.length === 0) return this.defaultValue(type);
    const [start, end] = dims[0];
    const arr: any = {};
    for (let i = start; i <= end; i++) {
      arr[i] = dims.length > 1
        ? this.createArray(dims.slice(1), type)
        : this.defaultValue(type);
    }
    return arr;
  }

  private async execBlock(stmts: Node[], env: Environment): Promise<any> {
    for (const stmt of stmts) {
      if (this.stopped) throw new Error('Execução interrompida pelo usuário.');
      const result = await this.exec(stmt, env);
      if (result instanceof ReturnSignal || result instanceof BreakSignal || result instanceof ContinueSignal) {
        return result;
      }
      this.notifyVariables(env);
    }
  }

  private notifyVariables(env: Environment) {
    if (this.io.onVariablesUpdate) {
      this.io.onVariablesUpdate({ ...this.globalEnv.getAll(), ...env.getAll() });
    }
  }

  private async exec(node: Node, env: Environment): Promise<any> {
    switch (node.kind) {
      case 'Assign': return this.execAssign(node as AssignNode, env);
      case 'Write': return this.execWrite(node as WriteNode, env);
      case 'Read': return this.execRead(node as ReadNode, env);
      case 'If': return this.execIf(node as IfNode, env);
      case 'While': return this.execWhile(node as WhileNode, env);
      case 'For': return this.execFor(node as ForNode, env);
      case 'Repeat': return this.execRepeat(node as RepeatNode, env);
      case 'Switch': return this.execSwitch(node as SwitchNode, env);
      case 'Return': return new ReturnSignal(node.value ? await this.eval(node.value, env) : undefined);
      case 'Break': return new BreakSignal();
      case 'Continue': return new ContinueSignal();
      case 'ProcedureCall': return this.execProcedureCall(node as ProcedureCallNode, env);
      case 'FunctionCall': return this.evalFunctionCall(node as FunctionCallNode, env);
      default: return null;
    }
  }

  private async execAssign(node: AssignNode, env: Environment) {
    const value = await this.eval(node.value, env);

    if (node.index) {
      const arr = env.get(node.target);
      if (node.index.length === 1) {
        const idx = await this.eval(node.index[0], env);
        arr[idx] = value;
      } else {
        const i = await this.eval(node.index[0], env);
        const j = await this.eval(node.index[1], env);
        arr[i][j] = value;
      }
    } else {
      env.set(node.target, value);
    }
  }

  private async execWrite(node: WriteNode, env: Environment) {
    const parts: string[] = [];
    for (const arg of node.args) {
      const val = await this.eval(arg, env);
      parts.push(this.stringify(val));
    }
    const text = parts.join('');
    if (node.newline) this.io.writeln(text);
    else this.io.write(text);
  }

  private async execRead(node: ReadNode, env: Environment) {
    for (const target of node.targets) {
      const input = await this.io.read();
      const trimmed = input.trim();
      const current = env.get(target);

      if (typeof current === 'number') {
        const num = trimmed.replace(',', '.');
        env.set(target, Number.isInteger(current) && !num.includes('.') ? parseInt(num, 10) : parseFloat(num));
      } else if (typeof current === 'boolean') {
        env.set(target, trimmed.toLowerCase() === 'verdadeiro' || trimmed === '1' || trimmed.toLowerCase() === 'true');
      } else {
        env.set(target, trimmed);
      }
    }
  }

  private async execIf(node: IfNode, env: Environment) {
    const cond = await this.eval(node.condition, env);
    if (this.isTruthy(cond)) {
      return this.execBlock(node.then, env);
    } else if (node.else) {
      return this.execBlock(node.else, env);
    }
  }

  private async execWhile(node: WhileNode, env: Environment) {
    while (this.isTruthy(await this.eval(node.condition, env))) {
      if (this.stopped) break;
      const result = await this.execBlock(node.body, env);
      if (result instanceof BreakSignal) break;
      if (result instanceof ReturnSignal) return result;
    }
  }

  private async execFor(node: ForNode, env: Environment) {
    let from = await this.eval(node.from, env);
    const to = await this.eval(node.to, env);
    const step = await this.eval(node.step, env);
    env.set(node.variable, from);

    while ((step > 0 ? from <= to : from >= to)) {
      if (this.stopped) break;
      env.set(node.variable, from);
      const result = await this.execBlock(node.body, env);
      if (result instanceof BreakSignal) break;
      if (result instanceof ReturnSignal) return result;
      from += step;
    }
  }

  private async execRepeat(node: RepeatNode, env: Environment) {
    do {
      if (this.stopped) break;
      const result = await this.execBlock(node.body, env);
      if (result instanceof BreakSignal) break;
      if (result instanceof ReturnSignal) return result;
    } while (!this.isTruthy(await this.eval(node.condition, env)));
  }

  private async execSwitch(node: SwitchNode, env: Environment) {
    const value = await this.eval(node.value, env);
    for (const c of node.cases) {
      if (c.value === null || await this.eval(c.value, env) === value) {
        const result = await this.execBlock(c.body, env);
        if (result instanceof ReturnSignal) return result;
        break;
      }
    }
  }

  private async execProcedureCall(node: ProcedureCallNode, env: Environment) {
    const fn = this.functions.get(node.name.toLowerCase());
    if (!fn) throw new Error(`Procedimento não encontrado: '${node.name}'`);

    const localEnv = new Environment(env);
    if (fn.params) {
      for (let i = 0; i < fn.params.length; i++) {
        const param = fn.params[i];
        const argVal = node.args[i] !== undefined ? await this.eval(node.args[i], env) : this.defaultValue(param.type);
        for (const name of param.names) localEnv.define(name, argVal);
      }
    }
    this.declareVars((fn as any).vars || [], localEnv);
    await this.execBlock(fn.body, localEnv);
  }

  // ─── Avaliação de expressões ─────────────────────────────────────────────

  private async eval(node: Node, env: Environment): Promise<any> {
    switch (node.kind) {
      case 'Literal': return (node as LiteralNode).value;
      case 'Identifier': return env.get((node as IdentifierNode).name);
      case 'ArrayAccess': return this.evalArrayAccess(node as ArrayAccessNode, env);
      case 'BinaryOp': return this.evalBinaryOp(node as BinaryOpNode, env);
      case 'UnaryOp': return this.evalUnaryOp(node as UnaryOpNode, env);
      case 'FunctionCall': return this.evalFunctionCall(node as FunctionCallNode, env);
      default: return null;
    }
  }

  private async evalArrayAccess(node: ArrayAccessNode, env: Environment): Promise<any> {
    const arr = env.get(node.name);
    if (node.indices.length === 1) {
      const idx = await this.eval(node.indices[0], env);
      return arr[idx];
    }
    const i = await this.eval(node.indices[0], env);
    const j = await this.eval(node.indices[1], env);
    return arr[i][j];
  }

  private async evalBinaryOp(node: BinaryOpNode, env: Environment): Promise<any> {
    const left = await this.eval(node.left, env);
    const right = await this.eval(node.right, env);
    switch (node.op) {
      case '+': return typeof left === 'string' || typeof right === 'string' ? String(left) + String(right) : left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': if (right === 0) throw new Error('Divisão por zero!'); return left / right;
      case '%': return left % right;
      case '\\': return Math.trunc(left / right);
      case '^': return Math.pow(left, right);
      case '=': return left === right;
      case '<>': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case 'e': return this.isTruthy(left) && this.isTruthy(right);
      case 'ou': return this.isTruthy(left) || this.isTruthy(right);
      case 'xou': return this.isTruthy(left) !== this.isTruthy(right);
      default: return null;
    }
  }

  private async evalUnaryOp(node: UnaryOpNode, env: Environment): Promise<any> {
    const val = await this.eval(node.operand, env);
    switch (node.op) {
      case '-': return -val;
      case 'nao': case 'não': return !this.isTruthy(val);
      default: return val;
    }
  }

  private async evalFunctionCall(node: FunctionCallNode, env: Environment): Promise<any> {
    const name = node.name.toLowerCase();

    // Built-in functions
    const args = await Promise.all(node.args.map(a => this.eval(a, env)));

    switch (name) {
      case 'abs': return Math.abs(args[0]);
      case 'arredonda': return Math.round(args[0] * Math.pow(10, args[1] || 0)) / Math.pow(10, args[1] || 0);
      case 'trunca': return Math.trunc(args[0]);
      case 'raizq': return Math.sqrt(args[0]);
      case 'pot': case 'potencia': return Math.pow(args[0], args[1]);
      case 'exp': return Math.exp(args[0]);
      case 'log': return Math.log10(args[0]);
      case 'logn': return Math.log(args[0]);
      case 'sen': return Math.sin(args[0] * Math.PI / 180);
      case 'cos': return Math.cos(args[0] * Math.PI / 180);
      case 'tan': return Math.tan(args[0] * Math.PI / 180);
      case 'pi': return Math.PI;
      case 'quad': return args[0] * args[0];
      case 'int': return Math.trunc(args[0]);
      case 'real': return parseFloat(args[0]);
      case 'aleatorio': return args.length === 2 ? Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0] : Math.random();
      case 'compr': case 'comprimento': return String(args[0]).length;
      case 'copia': return String(args[0]).substring(args[1] - 1, args[1] - 1 + args[2]);
      case 'pos': return String(args[1]).indexOf(String(args[0])) + 1;
      case 'maiuscula': case 'maiúscula': return String(args[0]).toUpperCase();
      case 'minuscula': case 'minúscula': return String(args[0]).toLowerCase();
      case 'asc': return String(args[0]).charCodeAt(0);
      case 'carac': return String.fromCharCode(args[0]);
      case 'numpcarac': return String(args[0]);
      case 'caracpara': case 'caracpara_num': return parseFloat(String(args[0]));
      case 'mod': return args[0] % args[1];
      case 'div': return Math.trunc(args[0] / args[1]);
      case 'limpatela': case 'limpa_tela': this.io.clear(); return;
      case 'hora': return new Date().toLocaleTimeString('pt-BR');
      case 'hoje': return new Date().toLocaleDateString('pt-BR');
      case 'escreva': {
        const text = args.map(a => this.stringify(a)).join('');
        this.io.write(text);
        return;
      }
      case 'escreval': {
        const text = args.map(a => this.stringify(a)).join('');
        this.io.writeln(text);
        return;
      }
      default: {
        // User-defined function
        const fn = this.functions.get(name);
        if (!fn || fn.kind !== 'FunctionDecl') throw new Error(`Função não encontrada: '${node.name}'`);
        const localEnv = new Environment(env);
        for (let i = 0; i < fn.params.length; i++) {
          const param = fn.params[i];
          for (const pName of param.names) localEnv.define(pName, args[i] ?? this.defaultValue(param.type));
        }
        this.declareVars(fn.vars, localEnv);
        const result = await this.execBlock(fn.body, localEnv);
        if (result instanceof ReturnSignal) return result.value;
        return null;
      }
    }
  }

  private isTruthy(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val !== '';
    return val != null;
  }

  private stringify(val: any): string {
    if (val === null || val === undefined) return 'nulo';
    if (typeof val === 'boolean') return val ? 'Verdadeiro' : 'Falso';
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return String(val);
      return val.toFixed(6).replace(/\.?0+$/, '');
    }
    return String(val);
  }
}
