import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Inicializa cliente Gemini do Google
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Heurística local de fallback para o Agente de IA
interface CalculationStep {
  a: number;
  operacao: '+' | '-' | '*' | '/';
  b: number;
  resultado: number;
}

interface Suggestion {
  operacao: '+' | '-' | '*' | '/';
  valor: number;
  titulo: string;
  explicacao: string;
}

function generateHeuristicSuggestions(history: CalculationStep[], currentVal: number): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const val = Number(currentVal);

  if (val > 1) {
    // 1. Parcelamento ou divisão em partes iguais
    const parcelas = val % 3 === 0 ? 3 : 2;
    suggestions.push({
      operacao: '/',
      valor: parcelas,
      titulo: `Dividir em ${parcelas} parcelas (/ ${parcelas})`,
      explicacao: `Ideal para dividir despesas ou pagamentos de ${val.toFixed(2)} em partes iguais.`,
    });

    // 2. Desconto comercial de 10%
    const dezPorCento = Math.round(val * 0.1 * 100) / 100;
    if (dezPorCento > 0) {
      suggestions.push({
        operacao: '-',
        valor: dezPorCento,
        titulo: `Aplicar 10% de desconto (- ${dezPorCento})`,
        explicacao: `Calcula o valor final deduzindo um desconto comercial padrão de 10%.`,
      });
      suggestions.push({
        operacao: '+',
        valor: dezPorCento,
        titulo: `Adicionar 10% de taxa / gorjeta (+ ${dezPorCento})`,
        explicacao: `Acréscimo de 10% comum em contas de restaurantes ou taxas de serviço.`,
      });
    }
  }

  // 3. Prova real se o último passo foi divisão
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last.operacao === '/' && last.b !== 0) {
      suggestions.push({
        operacao: '*',
        valor: last.b,
        titulo: `Prova real: Multiplicar por ${last.b} (* ${last.b})`,
        explicacao: `Confere se a multiplicação devolve exatamente o valor anterior à divisão.`,
      });
    }
  }

  // 4. Dobrar o valor
  if (val > 0 && val <= 100) {
    suggestions.push({
      operacao: '*',
      valor: 2,
      titulo: `Calcular o Dobro (* 2)`,
      explicacao: `Multiplica por 2 para projetar o dobro da quantidade ou orçamento.`,
    });
  }

  // Se não houver sugestões suficientes, adiciona padrão
  if (suggestions.length === 0) {
    suggestions.push({
      operacao: '+',
      valor: 10,
      titulo: `Somar 10 (+ 10)`,
      explicacao: `Passo inicial simples para continuar os cálculos.`,
    });
  }

  return suggestions.slice(0, 3);
}

// Endpoint para executar o cálculo diretamente via Python (calculadora.py)
app.post('/api/calculate', (req, res) => {
  const { operacao, a, b } = req.body;
  if (!operacao || a === undefined || b === undefined) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  // Executa o script Python oficial
  const safeOp = operacao === '*' ? '*' : operacao === '/' ? '/' : operacao === '+' ? '+' : '-';
  const pyCode = `import json; from calculadora import calcular; print(json.dumps({'resultado': calcular('${safeOp}', float(${a}), float(${b}))}))`;

  exec(`python3 -c "${pyCode}"`, { cwd: __dirname, timeout: 3000 }, (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(400).json({ error: stderr || 'Erro ao calcular em Python' });
    }
    try {
      const data = JSON.parse(stdout.trim());
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Erro ao interpretar resposta do Python' });
    }
  });
});

app.post('/api/suggest', async (req, res) => {
  const { history = [], currentVal = 0 } = req.body;

  // Se a chave não estiver configurada, usa heurística diretamente
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      source: 'local_heuristic',
      suggestions: generateHeuristicSuggestions(history, currentVal),
    });
  }

  try {
    const historyText = history
      .slice(-6)
      .map(
        (h: CalculationStep, idx: number) =>
          `Passo ${idx + 1}: ${h.a} ${h.operacao} ${h.b} = ${h.resultado}`
      )
      .join('\n');

    const prompt = `Você é o Alura IA, um agente de IA simples e didático para a Imersão Calculadora IA com 4 operações (+, -, *, /).
O valor numérico atual da calculadora é: ${currentVal}.
O histórico recente de cálculos é:
${historyText || '(Nenhum cálculo anterior, apenas o valor inicial)'}

Analise o padrão de cálculo do usuário (ex: finanças, compras, divisões proporcionais, orçamentos, dobro/metade, conferência de contas) e sugira entre 2 a 3 próximos passos lógicos.
ATENÇÃO: Cada sugestão DEVE usar APENAS uma das 4 operações matemáticas (+, -, *, /) e um número positivo razoável.

Retorne em formato JSON correspondente ao schema solicitado.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              operacao: {
                type: Type.STRING,
                description: "Apenas um destes quatro símbolos: '+', '-', '*', '/'",
              },
              valor: {
                type: Type.NUMBER,
                description: 'O número que será operado com o valor atual',
              },
              titulo: {
                type: Type.STRING,
                description: 'Título curto e direto (ex: Dividir em 3 parcelas)',
              },
              explicacao: {
                type: Type.STRING,
                description: 'Explicação simples do porquê sugerir esse passo',
              },
            },
            required: ['operacao', 'valor', 'titulo', 'explicacao'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Valida que as operações são estritamente +, -, *, /
      const cleaned = parsed
        .filter((item) => ['+', '-', '*', '/'].includes(item.operacao) && typeof item.valor === 'number')
        .slice(0, 3);

      if (cleaned.length > 0) {
        return res.json({
          source: 'gemini',
          suggestions: cleaned,
        });
      }
    }

    // Se o Gemini retornou vazio, usa heurística
    return res.json({
      source: 'local_heuristic',
      suggestions: generateHeuristicSuggestions(history, currentVal),
    });
  } catch (error) {
    console.warn('Fallback para heurística local:', error);
    return res.json({
      source: 'local_heuristic',
      suggestions: generateHeuristicSuggestions(history, currentVal),
    });
  }
});


async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
