# Portugol — VisuAlg Moderno para VS Code

Uma extensão completa para escrever e executar algoritmos em **Portugol/VisuAlg** diretamente no VS Code.

---

## Funcionalidades

| Recurso | Status |
|---|---|
| Syntax Highlighting | ✅ |
| Autocomplete inteligente | ✅ |
| Snippets de código | ✅ |
| Interpretador integrado | ✅ |
| Execução com F5 | ✅ |
| Painel de variáveis em tempo real | ✅ |
| Diagnósticos de erro (sublinhado) | ✅ |
| Suporte a funções e procedimentos | ✅ |
| Suporte a vetores e matrizes | ✅ |
| Funções matemáticas | ✅ |

---

## Como instalar

### Opção 1 — Pelo Marketplace (após publicar)
```
Ctrl+Shift+X → Buscar "Portugol" → Instalar
```

### Opção 2 — Desenvolvimento local

```bash
# 1. Clone ou baixe o projeto
cd portugol-vscode

# 2. Instale as dependências
npm install

# 3. Compile o TypeScript
npm run compile

# 4. Abra no VS Code
code .

# 5. Pressione F5 para abrir uma janela de desenvolvimento com a extensão ativa
```

---

## Como usar

1. Crie um arquivo com extensão `.alg`, `.por` ou `.portugol`
2. Escreva seu algoritmo em Portugol
3. Pressione **F5** ou clique em **▶** na barra de título para executar
4. Veja a saída no terminal integrado
5. Acompanhe as variáveis no painel lateral

---

## Snippets disponíveis

| Prefixo | Descrição |
|---|---|
| `algoritmo` | Estrutura base do algoritmo |
| `se` | Se-então |
| `sees` | Se-então-senão |
| `enquanto` | Laço enquanto |
| `para` | Laço para |
| `repita` | Laço repita-até |
| `escolha` | Escolha-caso |
| `vari` | Variável inteiro |
| `varr` | Variável real |
| `varc` | Variável caractere |
| `varl` | Variável lógico |
| `vetor` | Declaração de vetor |
| `matriz` | Declaração de matriz |
| `func` | Declaração de função |
| `proc` | Declaração de procedimento |

---

## 🔧 Funções built-in suportadas

### Entrada/Saída
- `escreva()`, `escreval()`, `leia()`, `limpatela()`

### Matemática
- `abs()`, `raizq()`, `potencia()`, `quad()`
- `sen()`, `cos()`, `tan()`, `pi()`
- `exp()`, `log()`, `logn()`
- `arredonda()`, `trunca()`, `int()`, `real()`
- `mod()`, `div()`, `aleatorio()`

### Texto
- `compr()`, `copia()`, `pos()`
- `maiuscula()`, `minuscula()`
- `asc()`, `carac()`, `numpcarac()`

### Data/Hora
- `hora()`, `hoje()`

---

## Estrutura do projeto

```
portugol-vscode/
├── src/
│   ├── extension.ts              # Ponto de entrada da extensão
│   ├── interpreter/
│   │   ├── lexer.ts              # Tokenizador
│   │   ├── parser.ts             # Gerador de AST
│   │   └── interpreter.ts        # Executor
│   ├── providers/
│   │   └── completionProvider.ts # Autocomplete
│   └── panels/
│       └── variablesPanel.ts     # Painel de variáveis
├── syntaxes/
│   └── portugol.tmLanguage.json  # Syntax highlighting
├── snippets/
│   └── portugol.json             # Snippets
├── exemplos/
│   └── calculadora.alg           # Exemplo de uso
├── language-configuration.json   # Configuração da linguagem
├── package.json                  # Manifesto da extensão
└── tsconfig.json                 # Configuração TypeScript
```

---

## Contribuindo

Pull requests são bem-vindos! Áreas que precisam de melhoria:

- [ ] Debugger com breakpoints
- [ ] Hover com documentação das funções
- [ ] Formatador de código (`Shift+Alt+F`)
- [ ] Suporte a `registro` (structs)
- [ ] Testes automatizados do interpretador
- [ ] Tradução de mensagens de erro para português mais amigável

---

## Licença

MIT — use, modifique e distribua à vontade.
