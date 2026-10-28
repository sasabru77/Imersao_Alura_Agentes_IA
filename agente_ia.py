"""
Imersão Calculadora IA - Módulo do Agente Inteligente (Alura IA)
Arquivo: agente_ia.py

A Alura IA é um agente inteligente em Python que analisa o histórico
dos cálculos anteriores e o valor atual para sugerir o próximo passo.
"""

import os
import json
from typing import List, Dict, Any, Optional

def sugerir_com_regras_simples(historico: List[Dict[str, Any]], valor_atual: float) -> List[Dict[str, Any]]:
    """
    Regras heurísticas da Alura IA para sugerir próximos passos lógicos.
    Não depende de chaves ou internet, funciona sempre!
    """
    val = float(valor_atual)
    sugestoes = []

    if val > 1:
        # Parcelamento em 2 ou 3 partes
        parcelas = 3 if val % 3 == 0 else 2
        sugestoes.append({
            "operacao": "/",
            "valor": float(parcelas),
            "titulo": f"Dividir em {parcelas} parcelas (/ {parcelas})",
            "explicacao": f"Útil para parcelar ou dividir despesas de R$ {val:.2f}."
        })

        # Desconto de 10%
        dez_por_cento = round(val * 0.10, 2)
        if dez_por_cento > 0:
            sugestoes.append({
                "operacao": "-",
                "valor": dez_por_cento,
                "titulo": f"Aplicar 10% de desconto (- {dez_por_cento})",
                "explicacao": f"Calcula o valor final subtraindo 10% de {val:.2f}."
            })
            sugestoes.append({
                "operacao": "+",
                "valor": dez_por_cento,
                "titulo": f"Adicionar 10% de taxa/gorjeta (+ {dez_por_cento})",
                "explicacao": f"Acréscimo padrão de serviço ou taxa sobre {val:.2f}."
            })

    # Prova real se o último cálculo foi divisão
    if historico:
        ultimo = historico[-1]
        if ultimo.get("operacao") in ('/', '÷') and ultimo.get("b", 0) != 0:
            divisor = float(ultimo.get("b", 1))
            sugestoes.append({
                "operacao": "*",
                "valor": divisor,
                "titulo": f"Prova real: Multiplicar por {divisor} (* {divisor})",
                "explicacao": "Conferir se o cálculo retorna ao número original antes da divisão."
            })

    # Dobro para valores menores
    if 0 < val <= 100:
        sugestoes.append({
            "operacao": "*",
            "valor": 2.0,
            "titulo": "Calcular o Dobro (* 2)",
            "explicacao": f"Dobra o valor de {val:.2f} para projeções e metas."
        })

    # Sugestão padrão inicial caso não haja nenhuma outra
    if not sugestoes:
        sugestoes.append({
            "operacao": "+",
            "valor": 10.0,
            "titulo": "Somar 10 (+ 10)",
            "explicacao": "Passo inicial para continuar os cálculos."
        })

    return sugestoes[:3]


def sugerir_com_gemini(historico: List[Dict[str, Any]], valor_atual: float) -> Optional[List[Dict[str, Any]]]:
    """
    Integração opcional com o modelo Gemini do Google usando a SDK oficial em Python.
    """
    chave = os.getenv("GEMINI_API_KEY")
    if not chave:
        return None

    try:
        from google import genai
        client = genai.Client(api_key=chave)

        linhas = [
            f"Passo: {h.get('a')} {h.get('operacao')} {h.get('b')} = {h.get('resultado')}"
            for h in historico[-5:]
        ]
        historico_str = "\n".join(linhas) if linhas else "(Início)"

        prompt = f"""
Você é a Alura IA, um agente inteligente simples para a Imersão Calculadora IA.
O valor numérico atual da calculadora é: {valor_atual}.
Histórico recente:
{historico_str}

Sugira 2 a 3 próximos passos lógicos usando APENAS uma das 4 operações matemáticas (+, -, *, /) e um número positivo.
Responda APENAS em JSON válido com esta estrutura:
[
  {{"operacao": "+", "valor": 10, "titulo": "Somar 10", "explicacao": "Para..."}},
  {{"operacao": "/", "valor": 2, "titulo": "Dividir em 2", "explicacao": "Para..."}}
]
"""
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )
        texto = response.text.strip()
        if texto.startswith("```json"):
            texto = texto[7:]
        if texto.endswith("```"):
            texto = texto[:-3]
        return json.loads(texto.strip())
    except Exception:
        return None


def obter_proximas_sugestoes(historico: List[Dict[str, Any]], valor_atual: float = 0.0) -> List[Dict[str, Any]]:
    """
    Retorna as sugestões da Alura IA (tenta Gemini se configurado, senão usa heurística local).
    """
    sugestoes_ia = sugerir_com_gemini(historico, valor_atual)
    if sugestoes_ia and isinstance(sugestoes_ia, list) and len(sugestoes_ia) > 0:
        return sugestoes_ia
    return sugerir_com_regras_simples(historico, valor_atual)
