"""
Imersão Calculadora IA - Módulo de Operações Matemáticas
Arquivo: calculadora.py

Contém as 4 operações fundamentais da matemática.
Desenvolvido em Python puro para iniciantes.
"""

def adicionar(a: float, b: float) -> float:
    """Retorna a soma de a e b (a + b)."""
    return a + b


def subtrair(a: float, b: float) -> float:
    """Retorna a subtração de b em a (a - b)."""
    return a - b


def multiplicar(a: float, b: float) -> float:
    """Retorna a multiplicação de a por b (a * b)."""
    return a * b


def dividir(a: float, b: float) -> float:
    """
    Retorna a divisão de a por b (a / b).
    Gera um erro se houver tentativa de divisão por zero.
    """
    if b == 0:
        raise ValueError("Erro: Divisão por zero não é permitida!")
    return a / b


def calcular(operacao: str, a: float, b: float) -> float:
    """
    Executa a operação matemática correspondente ao operador.
    Operadores aceitos: '+', '-', '*', '/'
    """
    if operacao == '+':
        return adicionar(a, b)
    elif operacao == '-':
        return subtrair(a, b)
    elif operacao in ('*', 'x', 'X'):
        return multiplicar(a, b)
    elif operacao in ('/', '÷'):
        return dividir(a, b)
    else:
        raise ValueError(f"Operação inválida: '{operacao}'. Use apenas +, -, * ou /")
