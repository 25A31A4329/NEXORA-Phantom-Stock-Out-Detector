import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Shared server-side Gemini client with recommended telemetry header
let ai: GoogleGenAI | null = null;
const isPlaceholderKey = process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY';
if (process.env.GEMINI_API_KEY && !isPlaceholderKey) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY && !isPlaceholderKey,
    appName: 'NEXORA',
    version: '1.0.0',
  });
});

// Gemini Explanations Endpoint (Optional NL audit synthesis)
app.post('/api/gemini/explain', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in server environment.',
        usingFallback: true,
      });
    }

    const { caseData } = req.body;
    if (!caseData) {
      return res.status(400).json({ error: 'Missing caseData payload' });
    }

    const prompt = `You are a Senior Retail Operations & Shrink Analyst for NEXORA, an intelligent Phantom Stock-Out decision support platform.
Analyze this suspected phantom stock-out case:
- SKU: ${caseData.sku} (${caseData.productName || 'Unknown Product'})
- Store: ${caseData.storeName || caseData.storeId} (Region: ${caseData.region || 'Standard'})
- System Recorded On-Hand Stock: ${caseData.recordedStock} units
- Recent Sales Velocity (last 7 days): ${Number(caseData.recentSalesAvg).toFixed(1)} units/day
- Baseline Historical Velocity (past 28 days): ${Number(caseData.baselineSalesAvg).toFixed(1)} units/day
- Sales Velocity Drop: ${Number(caseData.dropPercent || 0).toFixed(1)}%
- Consecutive Zero-Sales Streak: ${caseData.consecutiveZeroSalesDays} days
- Promotion Status: ${caseData.isPromoted ? 'ACTIVE PROMOTION (lift expected)' : 'Standard pricing'}
- Estimated Unit Retail Price: ₹${Number(caseData.unitPrice || 0).toFixed(2)}
- Risk Score: ${caseData.riskScore}/100 (${caseData.riskLevel})
- Rule-based Detection Flags: ${Array.isArray(caseData.reasons) ? caseData.reasons.join('; ') : 'Discrepancy detected'}

Write a structured, concise operational field memo for store operations (under 160 words):
1. **Root-Cause Hypothesis**: Top likely causes (e.g., mis-shelved in adjacent aisle, unworked backroom pallet, ghost inventory from cashier scan error, organized retail theft).
2. **Floor Verification Protocol**: Exact physical check action (shelf bay, top-stock riser, end-cap, backroom bin).
3. **Financial & Customer Impact**: Brief summary of lost sales velocity and risk of shopper substitution or walkout.

Keep tone objective, emphasizing this is a PREDICTED situation requiring physical audit, not a confirmed stock-out.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation request timed out after 8s')), 8000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert retail inventory audit intelligence analyst.',
        temperature: 0.3,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]) as any;

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error('Gemini explanation error:', error);
    res.status(500).json({ error: error?.message || 'Error generating AI audit explanation' });
  }
});

// Gemini Executive Summary Endpoint
app.post('/api/gemini/executive-summary', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured.',
        usingFallback: true,
      });
    }

    const { summaryData } = req.body;
    const prompt = `Synthesize an Executive Briefing for retail leadership regarding phantom inventory stock-outs:
- Unique Products Monitored: ${summaryData.totalSkus}
- Total Stores: ${summaryData.totalStores}
- Total Flagged Suspicious SKU-Store Combinations: ${summaryData.suspiciousCount}
- Critical/High Priority Verification Cases: ${summaryData.highPriorityCount}
- Estimated Total Potential Sales at Risk: ₹${Number(summaryData.salesAtRisk || 0).toLocaleString('en-IN')}
- Verification Progress: ${summaryData.verifiedCount} audits completed out of ${summaryData.totalCases} recommended

Provide:
1. Executive Snapshot (severity assessment of phantom stock-out risk across the store network)
2. Immediate Store Associate Allocation (how store managers should prioritize cycle counts & top-stock recovery)
3. Key Inventory Record Integrity Takeaways (addressing potential shrinkage, ghost scans, and backroom delays)

Keep it under 150 words, executive tone, actionable.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI executive summary timed out after 8s')), 8000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an executive retail supply chain intelligence strategist.',
        temperature: 0.3,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]) as any;

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('Gemini executive summary error:', error);
    res.status(500).json({ error: error?.message || 'Error generating AI summary' });
  }
});

// Mount Vite or static server
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`[NEXORA] Server listening on port ${port}`);
});
