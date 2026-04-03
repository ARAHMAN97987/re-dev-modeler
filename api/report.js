export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { reportData, lang } = await request.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    const isAr = lang === 'ar';
    const systemPrompt = `You are a senior real estate financial advisor writing a professional feasibility report for a Saudi Arabian real estate development project.

Write in ${isAr ? 'Arabic' : 'English'}. Be direct, specific, use actual numbers from the data.

SAUDI MARKET BENCHMARKS:
- Construction: Villa 3,400-9,000 | Apartment 4,500-11,250 | Retail 4,500-10,125 | Hotel 4★ 6,685-13,250 | Hotel 5★ 8,476-18,000 | Resort 14,000-24,000 SAR/m²
- Fund fees: Mgmt avg 1.32% | Dev fee avg 12.1% | Carry avg 23% | Hurdle typical 14-16%
- DSCR: Bank minimum 1.2x | Comfortable 1.5x+
- IRR: Strong >15% | Acceptable 12-15% | Weak <12%

Return ONLY valid JSON with these sections (each is markdown text):
{
  "executiveSummary": "1-page overview with project name, total CAPEX, key returns, verdict, top 3 risks",
  "projectDescription": "2-3 paragraphs about the project components, location, strategy",
  "financialAnalysis": "Detailed returns analysis (IRR, NPV, payback), revenue structure, cost breakdown with traffic lights 🟢🟡🔴",
  "capitalStructure": "Financing structure, debt vs equity, DSCR analysis, leverage assessment",
  "riskAnalysis": "Top 5 risks with mitigation strategies. Reference Smart Reviewer alerts.",
  "marketComparison": "Compare against Saudi benchmarks. Flag outliers with specific numbers.",
  "recommendations": "3-5 specific actionable recommendations with expected impact",
  "conclusion": "Final verdict: invest or not, key conditions, next steps"
}

IMPORTANT: Return ONLY valid JSON. No markdown fences. No preamble. No trailing text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate a professional feasibility report:\n\n${JSON.stringify(reportData, null, 2)}` }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: error }), {
        status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '';

    let sections;
    try {
      sections = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
    } catch {
      sections = { executiveSummary: text, error: 'Could not parse sections' };
    }

    return new Response(JSON.stringify({ sections }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
