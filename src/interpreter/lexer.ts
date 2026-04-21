// src/interpreter/lexer.ts
// Responsável por quebrar o código em tokens

export enum TokenType {
  // Literais
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',

  // Palavras-chave estruturais
  ALGORITMO = 'ALGORITMO',
  FIMALGORITMO = 'FIMALGORITMO',
  VAR = 'VAR',
  INICIO = 'INICIO',
  FIM = 'FIM',

  // Tipos
  INTEIRO = 'INTEIRO',
  REAL = 'REAL',
  CARACTERE = 'CARACTERE',
  LOGICO = 'LOGICO',
  VETOR = 'VETOR',

  // Controle de fluxo
  SE = 'SE',
  ENTAO = 'ENTAO',
  SENAO = 'SENAO',
  FIMSE = 'FIMSE',
  ENQUANTO = 'ENQUANTO',
  FACA = 'FACA',
  FIMENQUANTO = 'FIMENQUANTO',
  PARA = 'PARA',
  DE = 'DE',
  ATE = 'ATE',
  FIMPARA = 'FIMPARA',
  REPITA = 'REPITA',
  ESCOLHA = 'ESCOLHA',
  CASO = 'CASO',
  OUTROCASO = 'OUTROCASO',
  FIMESCOLHA = 'FIMESCOLHA',
  INTERROMPA = 'INTERROMPA',
  CONTINUE = 'CONTINUE',

  // Funções/Procedimentos
  PROCEDIMENTO = 'PROCEDIMENTO',
  FIMPROCEDIMENTO = 'FIMPROCEDIMENTO',
  FUNCAO = 'FUNCAO',
  FIMFUNCAO = 'FIMFUNCAO',
  RETORNE = 'RETORNE',

  // Operadores
  ASSIGN = 'ASSIGN',       // <-
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  MULTIPLY = 'MULTIPLY',   // *
  DIVIDE = 'DIVIDE',       // /
  MOD = 'MOD',             // %
  POWER = 'POWER',         // ^
  INTDIV = 'INTDIV',       // \

  // Comparação
  EQ = 'EQ',       // =
  NEQ = 'NEQ',     // <>
  LT = 'LT',       // <
  LTE = 'LTE',     // <=
  GT = 'GT',       // >
  GTE = 'GTE',     // >=

  // Lógicos
  AND = 'AND',     // e
  OR = 'OR',       // ou
  NOT = 'NOT',     // nao
  XOR = 'XOR',     // xou

  // Pontuação
  LPAREN = 'LPAREN',     // (
  RPAREN = 'RPAREN',     // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  COMMA = 'COMMA',       // ,
  COLON = 'COLON',       // :
  DOTDOT = 'DOTDOT',     // ..
  DOT = 'DOT',           // .

  // Especiais
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  'algoritmo': TokenType.ALGORITMO,
  'fimalgoritmo': TokenType.FIMALGORITMO,
  'var': TokenType.VAR,
  'inicio': TokenType.INICIO,
  'início': TokenType.INICIO,
  'fim': TokenType.FIM,
  'inteiro': TokenType.INTEIRO,
  'real': TokenType.REAL,
  'caractere': TokenType.CARACTERE,
  'caracter': TokenType.CARACTERE,
  'logico': TokenType.LOGICO,
  'lógico': TokenType.LOGICO,
  'vetor': TokenType.VETOR,
  'se': TokenType.SE,
  'entao': TokenType.ENTAO,
  'então': TokenType.ENTAO,
  'senao': TokenType.SENAO,
  'senão': TokenType.SENAO,
  'fimse': TokenType.FIMSE,
  'enquanto': TokenType.ENQUANTO,
  'faca': TokenType.FACA,
  'faça': TokenType.FACA,
  'fimenquanto': TokenType.FIMENQUANTO,
  'para': TokenType.PARA,
  'de': TokenType.DE,
  'ate': TokenType.ATE,
  'até': TokenType.ATE,
  'fimpara': TokenType.FIMPARA,
  'repita': TokenType.REPITA,
  'escolha': TokenType.ESCOLHA,
  'caso': TokenType.CASO,
  'outrocaso': TokenType.OUTROCASO,
  'fimescolha': TokenType.FIMESCOLHA,
  'interrompa': TokenType.INTERROMPA,
  'continue': TokenType.CONTINUE,
  'procedimento': TokenType.PROCEDIMENTO,
  'fimprocedimento': TokenType.FIMPROCEDIMENTO,
  'funcao': TokenType.FUNCAO,
  'função': TokenType.FUNCAO,
  'fimfuncao': TokenType.FIMFUNCAO,
  'fimfunção': TokenType.FIMFUNCAO,
  'retorne': TokenType.RETORNE,
  'verdadeiro': TokenType.BOOLEAN,
  'falso': TokenType.BOOLEAN,
  'e': TokenType.AND,
  'ou': TokenType.OR,
  'nao': TokenType.NOT,
  'não': TokenType.NOT,
  'xou': TokenType.XOR,
};

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.current();

      if (ch === '\n') {
        this.line++;
        this.column = 1;
        this.pos++;
        continue;
      }

      if (ch === '/' && this.peek() === '/') {
        this.readLineComment();
        continue;
      }

      if (ch === '{') {
        this.readBlockComment();
        continue;
      }

      if (ch === '"') {
        this.tokens.push(this.readString());
        continue;
      }

      if (this.isDigit(ch)) {
        this.tokens.push(this.readNumber());
        continue;
      }

      if (this.isAlpha(ch)) {
        this.tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      const op = this.readOperator();
      if (op) {
        this.tokens.push(op);
        continue;
      }

      // Caractere desconhecido, pula
      this.pos++;
      this.column++;
    }

    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return this.tokens;
  }

  private current(): string {
    return this.source[this.pos];
  }

  private peek(offset = 1): string {
    return this.source[this.pos + offset] || '';
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    this.column++;
    return ch;
  }

  private skipWhitespace() {
    while (this.pos < this.source.length && (this.current() === ' ' || this.current() === '\t' || this.current() === '\r')) {
      this.pos++;
      this.column++;
    }
  }

  private readLineComment() {
    while (this.pos < this.source.length && this.current() !== '\n') {
      this.pos++;
    }
  }

  private readBlockComment() {
    this.pos++; // skip {
    while (this.pos < this.source.length && this.current() !== '}') {
      if (this.current() === '\n') this.line++;
      this.pos++;
    }
    this.pos++; // skip }
  }

  private readString(): Token {
    const line = this.line;
    const col = this.column;
    this.advance(); // skip "
    let value = '';
    while (this.pos < this.source.length && this.current() !== '"') {
      if (this.current() === '\\') {
        this.advance();
        const esc = this.advance();
        if (esc === 'n') value += '\n';
        else if (esc === 't') value += '\t';
        else value += esc;
      } else {
        value += this.advance();
      }
    }
    this.advance(); // skip closing "
    return { type: TokenType.STRING, value, line, column: col };
  }

  private readNumber(): Token {
    const line = this.line;
    const col = this.column;
    let value = '';
    while (this.pos < this.source.length && (this.isDigit(this.current()) || this.current() === '.')) {
      if (this.current() === '.' && this.peek() === '.') break; // range ..
      value += this.advance();
    }
    return { type: TokenType.NUMBER, value, line, column: col };
  }

  private readIdentifierOrKeyword(): Token {
    const line = this.line;
    const col = this.column;
    let value = '';
    while (this.pos < this.source.length && this.isAlphaNumeric(this.current())) {
      value += this.advance();
    }
    const lower = value.toLowerCase();
    const type = KEYWORDS[lower] ?? TokenType.IDENTIFIER;
    return { type, value, line, column: col };
  }

  private readOperator(): Token | null {
    const line = this.line;
    const col = this.column;
    const ch = this.current();

    const twoChar = ch + this.peek();

    if (twoChar === '<-') { this.pos += 2; this.column += 2; return { type: TokenType.ASSIGN, value: '<-', line, column: col }; }
    if (twoChar === ':=') { this.pos += 2; this.column += 2; return { type: TokenType.ASSIGN, value: ':=', line, column: col }; }
    if (twoChar === '<>') { this.pos += 2; this.column += 2; return { type: TokenType.NEQ, value: '<>', line, column: col }; }
    if (twoChar === '<=') { this.pos += 2; this.column += 2; return { type: TokenType.LTE, value: '<=', line, column: col }; }
    if (twoChar === '>=') { this.pos += 2; this.column += 2; return { type: TokenType.GTE, value: '>=', line, column: col }; }
    if (twoChar === '..') { this.pos += 2; this.column += 2; return { type: TokenType.DOTDOT, value: '..', line, column: col }; }

    const single: Record<string, TokenType> = {
      '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE, '%': TokenType.MOD, '^': TokenType.POWER,
      '\\': TokenType.INTDIV, '=': TokenType.EQ, '<': TokenType.LT,
      '>': TokenType.GT, '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET, ',': TokenType.COMMA,
      ':': TokenType.COLON, '.': TokenType.DOT,
    };

    if (single[ch]) {
      this.advance();
      return { type: single[ch], value: ch, line, column: col };
    }

    return null;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return /[a-zA-ZÀ-ú_]/.test(ch);
  }

  private isAlphaNumeric(ch: string): boolean {
    return /[a-zA-ZÀ-ú0-9_]/.test(ch);
  }
}
