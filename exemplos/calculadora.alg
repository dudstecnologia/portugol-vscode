algoritmo "CalculadoraSimples"

var
   num1, num2, resultado : real
   operacao : caractere
   continuar : logico

inicio
   continuar <- verdadeiro
   limpatela()

   escreval("╔══════════════════════════════╗")
   escreval("║   CALCULADORA EM PORTUGOL    ║")
   escreval("╚══════════════════════════════╝")
   escreval("")

   enquanto (continuar) faça
      escreva("Digite o primeiro número: ")
      leia(num1)

      escreva("Digite o segundo número: ")
      leia(num2)

      escreval("")
      escreval("Operações disponíveis:")
      escreval("  + Adição")
      escreval("  - Subtração")
      escreval("  * Multiplicação")
      escreval("  / Divisão")
      escreva("Escolha uma operação: ")
      leia(operacao)

      escreval("")

      escolha (operacao)
         caso "+"
            resultado <- num1 + num2
            escreval("Resultado: ", num1, " + ", num2, " = ", resultado)
         caso "-"
            resultado <- num1 - num2
            escreval("Resultado: ", num1, " - ", num2, " = ", resultado)
         caso "*"
            resultado <- num1 * num2
            escreval("Resultado: ", num1, " * ", num2, " = ", resultado)
         caso "/"
            se (num2 = 0) então
               escreval("Erro: divisão por zero!")
            senão
               resultado <- num1 / num2
               escreval("Resultado: ", num1, " / ", num2, " = ", resultado)
            fimse
         outrocaso
            escreval("Operação inválida!")
      fimescolha

      escreval("")
      escreva("Deseja calcular novamente? (s/n): ")
      leia(operacao)

      se (operacao <> "s") então
         continuar <- falso
      fimse

      escreval("")
   fimenquanto

   escreval("Obrigado por usar a calculadora!")
fimalgoritmo
