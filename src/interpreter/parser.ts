// src/interpreter/parser.ts
import { Token, TokenType } from './lexer';

// ─── Tipos de nós da AST ───────────────────────────────────────────────────

export type Node =
  | ProgramNode | VarDeclNode | AssignNode | WriteNode | ReadNode
  | IfNode | WhileNode | ForNode | RepeatNode | SwitchNode
  | BinaryOpNode | UnaryOpNode | IdentifierNode | LiteralNode
  | ArrayAccessNode | FunctionCallNode | ProcedureCallNode
  | FunctionDeclNode | ProcedureDeclNode | ReturnNode | BlockNode
  | BreakNode | ContinueNode;

export interface ProgramNode { kind: 'Program'; name: string; vars: VarDeclNode[]; body: Node[]; functions: (FunctionDeclNode | ProcedureDeclNode)[]; }
export interface VarDeclNode { kind: 'VarDecl'; names: string[]; type: string; arrayDims?: [number, number][]; }
export interface AssignNode { kind: 'Assign'; target: string; index?: Node[]; value: Node; line: number; }
export interface WriteNode { kind: 'Write'; args: Node[]; newline: boolean; }
export interface ReadNode { kind: 'Read'; targets: string[]; }
export interface IfNode { kind: 'If'; condition: Node; then: Node[]; else?: Node[]; }
export interface WhileNode { kind: 'While'; condition: Node; body: Node[]; }
export interface ForNode { kind: 'For'; variable: string; from: Node; to: Node; step: Node; body: Node[]; }
export interface RepeatNode { kind: 'Repeat'; body: Node[]; condition: Node; }
export interface SwitchNode { kind: 'Switch'; value: Node; cases: { value: Node | null; body: Node[] }[]; }
export interface BinaryOpNode { kind: 'BinaryOp'; op: string; left: Node; right: Node; }
export interface UnaryOpNode { kind: 'UnaryOp'; op: string; operand: Node; }
export interface IdentifierNode { kind: 'Identifier'; name: string; line: number; }
export interface LiteralNode { kind: 'Literal'; value: number | string | boolean; }
export interface ArrayAccessNode { kind: 'ArrayAccess'; name: string; indices: Node[]; }
export interface FunctionCallNode { kind: 'FunctionCall'; name: string; args: Node[]; }
export interface ProcedureCallNode { kind: 'ProcedureCall'; name: string; args: Node[]; }
export interface FunctionDeclNode { kind: 'FunctionDecl'; name: string; params: VarDeclNode[]; returnType: string; vars: VarDeclNode[]; body: Node[]; }
export interface ProcedureDeclNode { kind: 'ProcedureDecl'; name: string; params: VarDeclNode[]; vars: VarDeclNode[]; body: Node[]; }
export interface ReturnNode { kind: 'Return'; value?: Node; }
export interface BlockNode { kind: 'Block'; body: Node[]; }
export interface BreakNode { kind: 'Break'; }
export interface ContinueNode { kind: 'Continue'; }

// ─── Parser ────────────────────────────────────────────────────────────────

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token { return this.tokens[this.pos]; }
  private peek(offset = 1): Token { return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  private expect(type: TokenType): Token {
    const tok = this.current();
    if (tok.type !== type) {
      throw new Error(`[Linha ${tok.line}] Esperado '${type}', encontrado '${tok.value}'`);
    }
    return this.advance();
  }

  private match(...types: TokenType[]): boolean {
    return types.includes(this.current().type);
  }

  parse(): ProgramNode {
    // Funções/procedimentos podem aparecer antes ou depois do algoritmo principal
    const functions: (FunctionDeclNode | ProcedureDeclNode)[] = [];

    // Coletar funções antes do algoritmo
    while (this.match(TokenType.FUNCAO, TokenType.PROCEDIMENTO)) {
      functions.push(this.parseFunctionOrProcedure());
    }

    this.expect(TokenType.ALGORITMO);
    let name = 'SemNome';
    if (this.match(TokenType.STRING)) {
      name = this.advance().value;
    } else if (this.match(TokenType.IDENTIFIER)) {
      name = this.advance().value;
    }

    // Funções entre o nome e var
    while (this.match(TokenType.FUNCAO, TokenType.PROCEDIMENTO)) {
      functions.push(this.parseFunctionOrProcedure());
    }

    const vars = this.parseVarSection();

    // Funções após var
    while (this.match(TokenType.FUNCAO, TokenType.PROCEDIMENTO)) {
      functions.push(this.parseFunctionOrProcedure());
    }

    this.expect(TokenType.INICIO);
    const body = this.parseStatements(TokenType.FIMALGORITMO);
    this.expect(TokenType.FIMALGORITMO);

    return { kind: 'Program', name, vars, body, functions };
  }

  private parseVarSection(): VarDeclNode[] {
    const vars: VarDeclNode[] = [];
    if (!this.match(TokenType.VAR)) return vars;
    this.advance();

    while (!this.match(TokenType.INICIO, TokenType.FUNCAO, TokenType.PROCEDIMENTO, TokenType.EOF)) {
      const decl = this.parseVarDecl();
      if (decl) vars.push(decl);
    }
    return vars;
  }

  private parseVarDecl(): VarDeclNode | null {
    if (!this.match(TokenType.IDENTIFIER)) return null;
    const names: string[] = [this.advance().value];

    while (this.match(TokenType.COMMA)) {
      this.advance();
      names.push(this.expect(TokenType.IDENTIFIER).value);
    }

    this.expect(TokenType.COLON);

    // Vetor
    if (this.match(TokenType.VETOR)) {
      this.advance();
      this.expect(TokenType.LBRACKET);
      const dims: [number, number][] = [];
      dims.push(this.parseDim());
      while (this.match(TokenType.COMMA)) {
        this.advance();
        dims.push(this.parseDim());
      }
      this.expect(TokenType.RBRACKET);
      this.expectKeyword('de');
      const type = this.parseTypeName();
      return { kind: 'VarDecl', names, type, arrayDims: dims };
    }

    const type = this.parseTypeName();
    return { kind: 'VarDecl', names, type };
  }

  private parseDim(): [number, number] {
    const start = Number(this.expect(TokenType.NUMBER).value);
    this.expect(TokenType.DOTDOT);
    const end = Number(this.expect(TokenType.NUMBER).value);
    return [start, end];
  }

  private parseTypeName(): string {
    const tok = this.current();
    if (this.match(TokenType.INTEIRO, TokenType.REAL, TokenType.CARACTERE, TokenType.LOGICO)) {
      return this.advance().value.toLowerCase();
    }
    if (this.match(TokenType.IDENTIFIER)) {
      return this.advance().value.toLowerCase();
    }
    throw new Error(`[Linha ${tok.line}] Tipo inválido: '${tok.value}'`);
  }

  private expectKeyword(word: string) {
    const tok = this.current();
    if (tok.value.toLowerCase() !== word) {
      throw new Error(`[Linha ${tok.line}] Esperado '${word}', encontrado '${tok.value}'`);
    }
    this.advance();
  }

  private parseStatements(...stopTokens: TokenType[]): Node[] {
    const stmts: Node[] = [];
    while (!this.match(TokenType.EOF, ...stopTokens)) {
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }
    return stmts;
  }

  private parseStatement(): Node | null {
    const tok = this.current();

    switch (tok.type) {
      case TokenType.SE: return this.parseIf();
      case TokenType.ENQUANTO: return this.parseWhile();
      case TokenType.PARA: return this.parseFor();
      case TokenType.REPITA: return this.parseRepeat();
      case TokenType.ESCOLHA: return this.parseSwitch();
      case TokenType.RETORNE: return this.parseReturn();
      case TokenType.INTERROMPA: this.advance(); return { kind: 'Break' };
      case TokenType.CONTINUE: this.advance(); return { kind: 'Continue' };

      case TokenType.IDENTIFIER: {
        const name = tok.value.toLowerCase();
        // Built-in write
        if (name === 'escreva' || name === 'escreval') return this.parseWrite();
        // Built-in read
        if (name === 'leia') return this.parseRead();
        // Built-in limpatela
        if (name === 'limpatela' || name === 'limpa_tela') {
          this.advance();
          if (this.match(TokenType.LPAREN)) { this.advance(); this.expect(TokenType.RPAREN); }
          return { kind: 'FunctionCall', name: 'limpatela', args: [] };
        }
        // Look-ahead: is it assignment or call?
        const next = this.peek();
        if (next.type === TokenType.ASSIGN || next.type === TokenType.LBRACKET) {
          return this.parseAssign();
        }
        // Procedure call
        return this.parseProcedureCall();
      }
    }
    // Skip unknown
    this.advance();
    return null;
  }

  private parseWrite(): WriteNode {
    const name = this.advance().value.toLowerCase();
    const newline = name === 'escreval';
    this.expect(TokenType.LPAREN);
    const args: Node[] = [];
    if (!this.match(TokenType.RPAREN)) {
      args.push(this.parseExpr());
      while (this.match(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseExpr());
      }
    }
    this.expect(TokenType.RPAREN);
    return { kind: 'Write', args, newline };
  }

  private parseRead(): ReadNode {
    this.advance(); // leia
    this.expect(TokenType.LPAREN);
    const targets: string[] = [this.expect(TokenType.IDENTIFIER).value];
    while (this.match(TokenType.COMMA)) {
      this.advance();
      targets.push(this.expect(TokenType.IDENTIFIER).value);
    }
    this.expect(TokenType.RPAREN);
    return { kind: 'Read', targets };
  }

  private parseAssign(): AssignNode {
    const tok = this.current();
    const target = this.advance().value;
    let index: Node[] | undefined;

    if (this.match(TokenType.LBRACKET)) {
      this.advance();
      index = [this.parseExpr()];
      while (this.match(TokenType.COMMA)) {
        this.advance();
        index.push(this.parseExpr());
      }
      this.expect(TokenType.RBRACKET);
    }

    this.expect(TokenType.ASSIGN);
    const value = this.parseExpr();
    return { kind: 'Assign', target, index, value, line: tok.line };
  }

  private parseProcedureCall(): ProcedureCallNode {
    const name = this.advance().value;
    const args: Node[] = [];
    if (this.match(TokenType.LPAREN)) {
      this.advance();
      if (!this.match(TokenType.RPAREN)) {
        args.push(this.parseExpr());
        while (this.match(TokenType.COMMA)) {
          this.advance();
          args.push(this.parseExpr());
        }
      }
      this.expect(TokenType.RPAREN);
    }
    return { kind: 'ProcedureCall', name, args };
  }

  private parseIf(): IfNode {
    this.advance(); // se
    this.consume(TokenType.LPAREN);
    const condition = this.parseExpr();
    this.consume(TokenType.RPAREN);
    this.expect(TokenType.ENTAO);

    const then = this.parseStatements(TokenType.SENAO, TokenType.FIMSE);
    let elsePart: Node[] | undefined;

    if (this.match(TokenType.SENAO)) {
      this.advance();
      elsePart = this.parseStatements(TokenType.FIMSE);
    }

    this.expect(TokenType.FIMSE);
    return { kind: 'If', condition, then, else: elsePart };
  }

  private parseWhile(): WhileNode {
    this.advance(); // enquanto
    this.consume(TokenType.LPAREN);
    const condition = this.parseExpr();
    this.consume(TokenType.RPAREN);
    this.expect(TokenType.FACA);
    const body = this.parseStatements(TokenType.FIMENQUANTO);
    this.expect(TokenType.FIMENQUANTO);
    return { kind: 'While', condition, body };
  }

  private parseFor(): ForNode {
    this.advance(); // para
    const variable = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.DE);
    const from = this.parseExpr();
    this.expect(TokenType.ATE);
    const to = this.parseExpr();

    let step: Node = { kind: 'Literal', value: 1 };
    if (this.current().value.toLowerCase() === 'passo') {
      this.advance();
      step = this.parseExpr();
    }

    this.expect(TokenType.FACA);
    const body = this.parseStatements(TokenType.FIMPARA);
    this.expect(TokenType.FIMPARA);
    return { kind: 'For', variable, from, to, step, body };
  }

  private parseRepeat(): RepeatNode {
    this.advance(); // repita
    const body = this.parseStatements(TokenType.ATE);
    this.expect(TokenType.ATE);
    this.consume(TokenType.LPAREN);
    const condition = this.parseExpr();
    this.consume(TokenType.RPAREN);
    return { kind: 'Repeat', body, condition };
  }

  private parseSwitch(): SwitchNode {
    this.advance(); // escolha
    this.consume(TokenType.LPAREN);
    const value = this.parseExpr();
    this.consume(TokenType.RPAREN);

    const cases: { value: Node | null; body: Node[] }[] = [];
    while (!this.match(TokenType.FIMESCOLHA, TokenType.EOF)) {
      if (this.match(TokenType.CASO)) {
        this.advance();
        const caseVal = this.parseExpr();
        const caseBody = this.parseStatements(TokenType.CASO, TokenType.OUTROCASO, TokenType.FIMESCOLHA);
        cases.push({ value: caseVal, body: caseBody });
      } else if (this.match(TokenType.OUTROCASO)) {
        this.advance();
        const caseBody = this.parseStatements(TokenType.FIMESCOLHA);
        cases.push({ value: null, body: caseBody });
      } else {
        this.advance();
      }
    }
    this.expect(TokenType.FIMESCOLHA);
    return { kind: 'Switch', value, cases };
  }

  private parseReturn(): ReturnNode {
    this.advance();
    if (this.match(TokenType.FIMFUNCAO, TokenType.EOF, TokenType.FIMALGORITMO)) {
      return { kind: 'Return' };
    }
    return { kind: 'Return', value: this.parseExpr() };
  }

  private parseFunctionOrProcedure(): FunctionDeclNode | ProcedureDeclNode {
    const isFn = this.match(TokenType.FUNCAO);
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER).value;

    const params: VarDeclNode[] = [];
    if (this.match(TokenType.LPAREN)) {
      this.advance();
      while (!this.match(TokenType.RPAREN, TokenType.EOF)) {
        const p = this.parseVarDecl();
        if (p) params.push(p);
        if (this.match(TokenType.COMMA)) this.advance();
      }
      this.expect(TokenType.RPAREN);
    }

    if (isFn) {
      this.expect(TokenType.COLON);
      const returnType = this.parseTypeName();
      const vars = this.parseVarSection();
      this.expect(TokenType.INICIO);
      const body = this.parseStatements(TokenType.FIMFUNCAO);
      this.expect(TokenType.FIMFUNCAO);
      return { kind: 'FunctionDecl', name, params, returnType, vars, body };
    } else {
      const vars = this.parseVarSection();
      this.expect(TokenType.INICIO);
      const body = this.parseStatements(TokenType.FIMPROCEDIMENTO);
      this.expect(TokenType.FIMPROCEDIMENTO);
      return { kind: 'ProcedureDecl', name, params, vars, body };
    }
  }

  // ─── Expressões (com precedência) ─────────────────────────────────────────

  private parseExpr(): Node { return this.parseOr(); }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.match(TokenType.OR)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseNot();
    while (this.match(TokenType.AND)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parseNot() };
    }
    return left;
  }

  private parseNot(): Node {
    if (this.match(TokenType.NOT)) {
      const op = this.advance().value;
      return { kind: 'UnaryOp', op, operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): Node {
    let left = this.parseAddSub();
    while (this.match(TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.LTE, TokenType.GT, TokenType.GTE)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parseAddSub() };
    }
    return left;
  }

  private parseAddSub(): Node {
    let left = this.parseMulDiv();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parseMulDiv() };
    }
    return left;
  }

  private parseMulDiv(): Node {
    let left = this.parsePower();
    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MOD, TokenType.INTDIV)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parsePower() };
    }
    return left;
  }

  private parsePower(): Node {
    let left = this.parseUnary();
    if (this.match(TokenType.POWER)) {
      const op = this.advance().value;
      left = { kind: 'BinaryOp', op, left, right: this.parsePower() };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.match(TokenType.MINUS)) {
      const op = this.advance().value;
      return { kind: 'UnaryOp', op, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const tok = this.current();

    if (tok.type === TokenType.NUMBER) {
      this.advance();
      const v = tok.value.includes('.') ? parseFloat(tok.value) : parseInt(tok.value, 10);
      return { kind: 'Literal', value: v };
    }

    if (tok.type === TokenType.STRING) {
      this.advance();
      return { kind: 'Literal', value: tok.value };
    }

    if (tok.type === TokenType.BOOLEAN) {
      this.advance();
      return { kind: 'Literal', value: tok.value.toLowerCase() === 'verdadeiro' };
    }

    if (tok.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    if (tok.type === TokenType.IDENTIFIER) {
      const name = tok.value;
      this.advance();

      // Array access
      if (this.match(TokenType.LBRACKET)) {
        this.advance();
        const indices = [this.parseExpr()];
        while (this.match(TokenType.COMMA)) {
          this.advance();
          indices.push(this.parseExpr());
        }
        this.expect(TokenType.RBRACKET);
        return { kind: 'ArrayAccess', name, indices };
      }

      // Function call
      if (this.match(TokenType.LPAREN)) {
        this.advance();
        const args: Node[] = [];
        if (!this.match(TokenType.RPAREN)) {
          args.push(this.parseExpr());
          while (this.match(TokenType.COMMA)) {
            this.advance();
            args.push(this.parseExpr());
          }
        }
        this.expect(TokenType.RPAREN);
        return { kind: 'FunctionCall', name, args };
      }

      return { kind: 'Identifier', name, line: tok.line };
    }

    // Se não reconhecer, retorna literal vazio para evitar crash
    this.advance();
    return { kind: 'Literal', value: 0 };
  }

  private consume(type: TokenType) {
    if (this.match(type)) this.advance();
  }
}
