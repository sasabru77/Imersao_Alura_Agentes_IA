/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Bot,
  Sparkles,
  BookOpen,
  RefreshCw,
  ArrowRight,
  History,
  Trash2,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

interface CalculationStep {
  a: number;
  operacao: '+' | '-' | '*' | '/';
  b: number;
  resultado: number;
  timestamp: string;
}

interface Suggestion {
  operacao: '+' | '-' | '*' | '/';
  valor: number;
  titulo: string;
  explicacao: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'guide'>('calculator');

  // Estado da Calculadora
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [currentOperator, setCurrentOperator] = useState<'+' | '-' | '*' | '/' | null>(null);
  const [waitingForNextValue, setWaitingForNextValue] = useState<boolean>(false);
  const [history, setHistory] = useState<CalculationStep[]>([]);
  const [lastEquation, setLastEquation] = useState<string>('');

  // Estado da Alura_IA
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      operacao: '+',
      valor: 10,
      titulo: 'Somar 10 (+ 10)',
      explicacao: 'Faça um primeiro cálculo para a Alura IA analisar seus passos e sugerir o próximo!',
    },
    {
      operacao: '*',
      valor: 2,
      titulo: 'Calcular o Dobro (* 2)',
      explicacao: 'Multiplica o valor por 2 para ver projeções de crescimento.',
    },
    {
      operacao: '/',
      valor: 2,
      titulo: 'Calcular a Metade (/ 2)',
      explicacao: 'Divide o número em 2 partes iguais.',
    },
  ]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [suggestionSource, setSuggestionSource] = useState<'gemini' | 'local_heuristic'>('local_heuristic');

  // Busca sugestões da Alura IA
  const fetchSuggestions = async (hist: CalculationStep[], curVal: number) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: hist,
          currentVal: curVal,
        }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setSuggestionSource(data.source || 'local_heuristic');
      }
    } catch (err) {
      console.warn('Erro ao buscar sugestões:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Funções matemáticas básicas (as 4 operações fundamentais)
  const executarCalculo = (a: number, op: '+' | '-' | '*' | '/', b: number): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        if (b === 0) throw new Error('Não é possível dividir por zero!');
        return a / b;
    }
  };

  // Entrada de dígitos
  const inputDigit = (digit: string) => {
    if (waitingForNextValue) {
      setDisplayValue(digit);
      setWaitingForNextValue(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  // Ponto decimal
  const inputDecimal = () => {
    if (waitingForNextValue) {
      setDisplayValue('0.');
      setWaitingForNextValue(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  // Inverter sinal (±)
  const toggleSign = () => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      setDisplayValue(String(-val));
    }
  };

  // Apagar último dígito
  const backspace = () => {
    if (waitingForNextValue) return;
    if (displayValue.length > 1) {
      setDisplayValue(displayValue.slice(0, -1));
    } else {
      setDisplayValue('0');
    }
  };

  // Limpar tudo
  const clearAll = () => {
    setDisplayValue('0');
    setStoredValue(null);
    setCurrentOperator(null);
    setWaitingForNextValue(false);
    setLastEquation('');
  };

  // Limpar histórico
  const clearHistory = () => {
    setHistory([]);
  };

  // Selecionar operador (+, -, *, /)
  const handleOperator = (nextOp: '+' | '-' | '*' | '/') => {
    const inputValue = parseFloat(displayValue);

    if (storedValue === null) {
      setStoredValue(inputValue);
      setLastEquation(`${inputValue} ${nextOp}`);
    } else if (currentOperator && !waitingForNextValue) {
      try {
        const result = executarCalculo(storedValue, currentOperator, inputValue);
        const rounded = Math.round(result * 100000) / 100000;
        setDisplayValue(String(rounded));
        setStoredValue(rounded);
        setLastEquation(`${rounded} ${nextOp}`);

        const newStep: CalculationStep = {
          a: storedValue,
          operacao: currentOperator,
          b: inputValue,
          resultado: rounded,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        const updatedHistory = [...history, newStep];
        setHistory(updatedHistory);
        fetchSuggestions(updatedHistory, rounded);
      } catch (err: any) {
        setDisplayValue('Erro: Divisão por 0');
        setStoredValue(null);
        setCurrentOperator(null);
        setWaitingForNextValue(true);
        return;
      }
    } else {
      setLastEquation(`${storedValue} ${nextOp}`);
    }

    setCurrentOperator(nextOp);
    setWaitingForNextValue(true);
  };

  // Tecla de igual (=)
  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);
    if (storedValue === null || currentOperator === null) {
      return;
    }

    try {
      const result = executarCalculo(storedValue, currentOperator, inputValue);
      const rounded = Math.round(result * 100000) / 100000;
      setLastEquation(`${storedValue} ${currentOperator} ${inputValue} =`);
      setDisplayValue(String(rounded));

      const newStep: CalculationStep = {
        a: storedValue,
        operacao: currentOperator,
        b: inputValue,
        resultado: rounded,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      const updatedHistory = [...history, newStep];
      setHistory(updatedHistory);
      fetchSuggestions(updatedHistory, rounded);

      setStoredValue(null);
      setCurrentOperator(null);
      setWaitingForNextValue(true);
    } catch (err: any) {
      setDisplayValue('Erro: Divisão por 0');
      setStoredValue(null);
      setCurrentOperator(null);
      setWaitingForNextValue(true);
    }
  };

  // Aplica uma sugestão da Alura IA com 1 clique
  const applySuggestion = (sug: Suggestion) => {
    const baseValue = parseFloat(displayValue);
    if (isNaN(baseValue)) return;

    try {
      const result = executarCalculo(baseValue, sug.operacao, sug.valor);
      const rounded = Math.round(result * 100000) / 100000;

      setLastEquation(`${baseValue} ${sug.operacao} ${sug.valor} =`);
      setDisplayValue(String(rounded));

      const newStep: CalculationStep = {
        a: baseValue,
        operacao: sug.operacao,
        b: sug.valor,
        resultado: rounded,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      const updatedHistory = [...history, newStep];
      setHistory(updatedHistory);
      fetchSuggestions(updatedHistory, rounded);

      setStoredValue(null);
      setCurrentOperator(null);
      setWaitingForNextValue(true);
    } catch (err: any) {
      setDisplayValue('Erro');
    }
  };

  // Suporte a teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('*');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('/');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayValue, storedValue, currentOperator, waitingForNextValue, history]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white">
      {/* Top Header Limpo, Espaçoso e Sem Sobreposição */}
      <header className="border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo e Título da Imersão Calculadora IA */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Ícone Estilizado da Calculadora com Gradiente */}
            <div className="relative group flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-slate-950" />
              </div>
            </div>

            {/* Título e Descrição */}
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight leading-tight truncate">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  Imersão
                </span>{' '}
                Calculadora IA
              </h1>
              <p className="text-xs text-slate-400 font-normal leading-normal truncate">
                Com <span className="text-cyan-400 font-medium">Alura IA</span> sugerindo seus próximos passos de cálculo
              </p>
            </div>
          </div>

          {/* Navegação apenas com Calculadora e Guia do Iniciante */}
          <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner flex-shrink-0">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Calculadora</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Guia do Iniciante</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calculadora (Center/Left) */}
            <div className="lg:col-span-7 xl:col-span-6 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                {/* Visual Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Display */}
                <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 mb-6 flex flex-col justify-end min-h-[130px] relative">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono text-cyan-400 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      4 Operações: + − × ÷
                    </span>
                    <span className="font-mono text-slate-500">{lastEquation || 'Pronto'}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-white tracking-tight break-all">
                      {displayValue}
                    </span>
                  </div>

                  {currentOperator && (
                    <div className="absolute top-4 right-5 text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Operando: {currentOperator === '*' ? '×' : currentOperator === '/' ? '÷' : currentOperator}
                    </div>
                  )}
                </div>

                {/* Alura IA Status Banner */}
                <div className="mb-5 bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-cyan-300 font-medium">Alura IA pronta:</span>
                    <span className="text-slate-400">Sugestões ativas ao lado</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {history.length} {history.length === 1 ? 'passo realizado' : 'passos realizados'}
                  </span>
                </div>

                {/* Grid dos Botões da Calculadora */}
                <div className="grid grid-cols-4 gap-3">
                  {/* Linha 1 */}
                  <button
                    onClick={clearAll}
                    className="h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-lg transition-all active:scale-95 flex items-center justify-center"
                    title="Limpar tudo (Esc)"
                  >
                    AC
                  </button>
                  <button
                    onClick={backspace}
                    className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium text-lg transition-all active:scale-95 flex items-center justify-center"
                    title="Apagar dígito (Backspace)"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={toggleSign}
                    className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium text-lg transition-all active:scale-95 flex items-center justify-center"
                    title="Inverter sinal (±)"
                  >
                    ±
                  </button>
                  <button
                    onClick={() => handleOperator('/')}
                    className={`h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center ${
                      currentOperator === '/'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300'
                    }`}
                    title="Divisão (/)"
                  >
                    ÷
                  </button>

                  {/* Linha 2 */}
                  <button
                    onClick={() => inputDigit('7')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    7
                  </button>
                  <button
                    onClick={() => inputDigit('8')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    8
                  </button>
                  <button
                    onClick={() => inputDigit('9')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    9
                  </button>
                  <button
                    onClick={() => handleOperator('*')}
                    className={`h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center ${
                      currentOperator === '*'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300'
                    }`}
                    title="Multiplicação (*)"
                  >
                    ×
                  </button>

                  {/* Linha 3 */}
                  <button
                    onClick={() => inputDigit('4')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    4
                  </button>
                  <button
                    onClick={() => inputDigit('5')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    5
                  </button>
                  <button
                    onClick={() => inputDigit('6')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    6
                  </button>
                  <button
                    onClick={() => handleOperator('-')}
                    className={`h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center ${
                      currentOperator === '-'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300'
                    }`}
                    title="Subtração (-)"
                  >
                    −
                  </button>

                  {/* Linha 4 */}
                  <button
                    onClick={() => inputDigit('1')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    1
                  </button>
                  <button
                    onClick={() => inputDigit('2')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    2
                  </button>
                  <button
                    onClick={() => inputDigit('3')}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    3
                  </button>
                  <button
                    onClick={() => handleOperator('+')}
                    className={`h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center ${
                      currentOperator === '+'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
                    }`}
                    title="Adição (+)"
                  >
                    +
                  </button>

                  {/* Linha 5 */}
                  <button
                    onClick={() => inputDigit('0')}
                    className="col-span-2 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95 text-left pl-6"
                  >
                    0
                  </button>
                  <button
                    onClick={inputDecimal}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-white font-medium text-xl transition-all active:scale-95"
                  >
                    ,
                  </button>
                  <button
                    onClick={handleEquals}
                    className="h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-2xl transition-all active:scale-95 shadow-lg shadow-cyan-500/25 flex items-center justify-center"
                    title="Calcular resultado (= ou Enter)"
                  >
                    =
                  </button>
                </div>
              </div>

              {/* Dica de teclado */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-between">
                <span>⌨️ Teclado disponível: números, +, -, *, /, Enter e Esc</span>
                <span className="text-slate-500">Prático & Rápido</span>
              </div>
            </div>

            {/* Painel Alura IA e Histórico (Right/Side) */}
            <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-6">
              {/* Card da Alura IA */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base flex items-center gap-2">
                        Alura IA
                        <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-medium">
                          <Sparkles className="w-2.5 h-2.5" />
                          {suggestionSource === 'gemini' ? 'Gemini 3.8 Flash' : 'Modo Heurístico'}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">Sugestões inteligentes para o seu próximo passo de cálculo</p>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchSuggestions(history, parseFloat(displayValue) || 0)}
                    disabled={loadingSuggestions}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                    title="Pedir novas sugestões à Alura IA"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>

                {/* Lista de Sugestões Inteligentes */}
                <div className="space-y-3">
                  {loadingSuggestions ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                      <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">A Alura IA está analisando seu cálculo...</p>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-6 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                      Faça um cálculo acima para receber sugestões da Alura IA!
                    </div>
                  ) : (
                    suggestions.map((sug, idx) => {
                      const curNum = parseFloat(displayValue) || 0;
                      let previa = 0;
                      try {
                        previa = executarCalculo(curNum, sug.operacao, sug.valor);
                      } catch {
                        previa = 0;
                      }

                      return (
                        <div
                          key={idx}
                          className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    sug.operacao === '+'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : sug.operacao === '-'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : sug.operacao === '*'
                                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  }`}
                                >
                                  {sug.operacao === '*' ? '×' : sug.operacao === '/' ? '÷' : sug.operacao} {sug.valor}
                                </span>
                                <h3 className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                                  {sug.titulo}
                                </h3>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{sug.explicacao}</p>
                            </div>

                            <button
                              onClick={() => applySuggestion(sug)}
                              className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 flex-shrink-0"
                            >
                              <span>Aplicar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-2 mt-2">
                            <span>Prévia do resultado:</span>
                            <span className="text-slate-300 font-semibold">
                              {curNum} {sug.operacao === '*' ? '×' : sug.operacao === '/' ? '÷' : sug.operacao}{' '}
                              {sug.valor} = {Math.round(previa * 100) / 100}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>
                    A <strong className="text-slate-400">Alura IA</strong> detecta padrões como parcelamentos, descontos e prova real.
                  </span>
                </div>
              </div>

              {/* Histórico dos Cálculos */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col max-h-[360px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-sm text-white">Histórico de Passos ({history.length})</h3>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Nenhum cálculo efetuado ainda. Comece a calcular para registrar os passos!
                    </div>
                  ) : (
                    history.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-slate-300">
                            {step.a} {step.operacao === '*' ? '×' : step.operacao === '/' ? '÷' : step.operacao}{' '}
                            {step.b}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white text-sm">= {step.resultado}</span>
                          <span className="text-[10px] text-slate-500">{step.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Guia do Iniciante (Mantido e aprimorado) */}
        {activeTab === 'guide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">1. As 4 Operações Fundamentais</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Em qualquer calculadora bem construída, as operações matemáticas devem ser isoladas em funções
                independentes. Isso facilita testes, leitura e manutenção.
              </p>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                <div><span className="text-cyan-400">Adição (+):</span> Retorna a soma entre dois números (ex: 10 + 5 = 15)</div>
                <div><span className="text-amber-400">Subtração (−):</span> Retorna a diferença (ex: 20 − 7 = 13)</div>
                <div><span className="text-indigo-400">Multiplicação (×):</span> Retorna o produto (ex: 6 × 7 = 42)</div>
                <div><span className="text-blue-400">Divisão (÷):</span> Retorna o quociente com proteção contra divisão por zero</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">2. O que é a Alura IA?</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                A <strong>Alura IA</strong> é um agente inteligente simples que observa o <strong>histórico de ações</strong> e,
                com base em padrões matemáticos e do dia a dia, recomenda a <strong>próxima melhor ação</strong>.
              </p>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>Descontos:</strong> Se o valor é 200, sugere subtrair 10% (- 20).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>Parcelamento:</strong> Sugere dividir em 2x ou 3x (/ 2, / 3).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>Prova Real:</strong> Se você dividiu por 4, sugere multiplicar por 4 de volta.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">3. Como Funciona a Aplicação em 1 Clique</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Quando a Alura IA sugere um passo, você não precisa digitar a operação e o número manualmente:
              </p>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="text-slate-400">• O card mostra a operação recomendada e o valor sugerido.</div>
                <div className="text-slate-400">• Você pode conferir a prévia do resultado antes de aplicar.</div>
                <div className="text-cyan-400 font-medium">• Basta clicar no botão "Aplicar" para executar o cálculo instantaneamente!</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">4. Por que este Projeto é Bom para Iniciantes?</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                A Imersão Calculadora IA demonstra como construir interfaces intuitivas com inteligência artificial prática:
              </p>
              <div className="text-xs text-slate-300 space-y-1.5">
                <div>• <strong>Matemática pura:</strong> 4 operações fundamentais com regras bem definidas.</div>
                <div>• <strong>Agente inteligente:</strong> Alura IA prevendo necessidades contextuais.</div>
                <div>• <strong>Interface responsiva:</strong> Visual moderno, rápido e sem complicações.</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Imersão Calculadora IA com Alura</span>
          <span>Adição (+) • Subtração (−) • Multiplicação (×) • Divisão (÷)</span>
        </div>
      </footer>
    </div>
  );
}
