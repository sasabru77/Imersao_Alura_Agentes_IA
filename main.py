"""
Imersão Calculadora IA - Terminal Interativo em Python
Arquivo: main.py

Como rodar:
    python main.py
(ou python3 main.py)
"""

import sys
from calculadora import calcular
from agente_ia import obter_proximas_sugestoes

def main():
    print("=" * 60)
    print(" 🧮  IMERSÃO CALCULADORA IA - COM ALURA IA (100% PYTHON)  🧮")
    print(" 4 Operações: (+) Adição  (-) Subtração  (*) Multiplicação  (/) Divisão")
    print("=" * 60)

    historico = []

    # Entrada do número inicial
    while True:
        try:
            entrada = input("\n👉 Digite o número inicial para começar: ")
            resultado_atual = float(entrada.replace(',', '.'))
            break
        except ValueError:
            print("❌ Número inválido. Digite um número como 10 ou 25.5.")

    while True:
        print("\n" + "-" * 60)
        print(f"📊 VALOR ATUAL: [ {resultado_atual:.2f} ]")

        # Alura IA gera as sugestões em Python
        sugestoes = obter_proximas_sugestoes(historico, resultado_atual)

        print("\n🤖 SUGESTÕES DE ALURA IA PARA O PRÓXIMO PASSO:")
        for idx, sug in enumerate(sugestoes, 1):
            op = sug['operacao']
            val = sug['valor']
            try:
                prev = calcular(op, resultado_atual, val)
                previa_str = f" | Prévia: {resultado_atual:.2f} {op} {val} = {prev:.2f}"
            except Exception:
                previa_str = ""
            print(f"  [{idx}] {sug['titulo']}{previa_str}")
            print(f"      ↳ {sug['explicacao']}")

        print("\nComandos:")
        print("  • Escolha [1], [2] ou [3] para aplicar a sugestão da Alura IA")
        print("  • Ou pressione ENTER para digitar sua própria operação (+, -, *, /)")
        print("  • [h] Ver histórico de cálculos")
        print("  • [z] Zerar a calculadora")
        print("  • [s] Sair do programa")

        escolha = input("\n👉 Sua escolha: ").strip().lower()

        if escolha == 's':
            print("\n👋 Obrigado por usar a Imersão Calculadora IA com Alura! Até logo!")
            break

        if escolha == 'h':
            print("\n📜 HISTÓRICO DE CÁLCULOS:")
            if not historico:
                print("   (Nenhum cálculo registrado ainda)")
            else:
                for i, item in enumerate(historico, 1):
                    print(f"   Passo {i}: {item['a']} {item['operacao']} {item['b']} = {item['resultado']}")
            input("\nPressione ENTER para continuar...")
            continue

        if escolha == 'z':
            historico.clear()
            while True:
                try:
                    entrada = input("\n👉 Digite o novo número inicial: ")
                    resultado_atual = float(entrada.replace(',', '.'))
                    break
                except ValueError:
                    print("❌ Número inválido.")
            continue

        # Aplica sugestão da Alura IA ou recebe operação manual
        if escolha in ('1', '2', '3') and int(escolha) <= len(sugestoes):
            sug_escolhida = sugestoes[int(escolha) - 1]
            operacao = sug_escolhida['operacao']
            proximo_numero = sug_escolhida['valor']
            print(f"\n🤖 Aplicando sugestão de Alura IA: {sug_escolhida['titulo']}")
        else:
            while True:
                op_in = input("👉 Escolha a operação (+, -, *, /): ").strip()
                if op_in in ('+', '-', '*', '/', 'x', 'X', '÷'):
                    operacao = op_in
                    break
                print("❌ Use apenas +, -, * ou /")

            while True:
                num_in = input(f"👉 Digite o número ({resultado_atual} {operacao} ?): ").strip()
                try:
                    proximo_numero = float(num_in.replace(',', '.'))
                    if operacao in ('/', '÷') and proximo_numero == 0:
                        print("❌ Erro: Não é possível dividir por zero!")
                        continue
                    break
                except ValueError:
                    print("❌ Número inválido.")

        try:
            novo_resultado = calcular(operacao, resultado_atual, proximo_numero)
            historico.append({
                "a": resultado_atual,
                "operacao": operacao,
                "b": proximo_numero,
                "resultado": novo_resultado
            })
            print(f"\n🎉 Resultado: {resultado_atual} {operacao} {proximo_numero} = {novo_resultado:.2f}")
            resultado_atual = novo_resultado
        except ValueError as err:
            print(f"\n❌ {err}")

if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\n\n👋 Encerrado. Até a próxima!")
        sys.exit(0)
