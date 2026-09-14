// Vercel Serverless Function for /api/ai-diagnose
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, fileName = 'main.c', output = '', customPrompt = '' } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ success: false, fallback: true, message: 'No GEMINI_API_KEY' });
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Analise o seguinte arquivo de código em linguagem C ('${fileName}') e a saída do compilador/execução:

CÓDIGO FONTE:
\`\`\`c
${code}
\`\`\`

SAÍDA DO COMPILADOR / EXECUÇÃO:
\`\`\`
${output}
\`\`\`
${customPrompt ? `DÚVIDA ESPECÍFICA DO USUÁRIO: ${customPrompt}` : ''}

Forneça um diagnóstico didático estruturado em formato JSON com os seguintes campos:
- hasError (boolean): se há algum erro ou advertência grave no código
- errorTitle (string): título curto e claro do problema
- file (string): nome do arquivo
- line (number): número da linha onde está o erro (se detectado)
- col (number): número da coluna (se detectado, ou 1)
- whatWentWrong (string): explicação em Português simples do que exatamente o usuário errou
- whyItHappened (string): explicação técnica de como a linguagem C e o compilador funcionam nesse caso
- howToFix (string): instruções claras de como corrigir
- originalSnippet (string): trecho do código que contém o erro
- fixedSnippet (string): trecho corrigido correspondente
- fullFixedCode (string): o arquivo de código C completo com a correção aplicada
- category (string): um de "syntax", "type_mismatch", "memory", "include", "runtime", "logic"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasError: { type: Type.BOOLEAN },
            errorTitle: { type: Type.STRING },
            file: { type: Type.STRING },
            line: { type: Type.INTEGER },
            col: { type: Type.INTEGER },
            whatWentWrong: { type: Type.STRING },
            whyItHappened: { type: Type.STRING },
            howToFix: { type: Type.STRING },
            originalSnippet: { type: Type.STRING },
            fixedSnippet: { type: Type.STRING },
            fullFixedCode: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: [
            'hasError',
            'errorTitle',
            'whatWentWrong',
            'whyItHappened',
            'howToFix',
            'category',
          ],
        },
      },
    });

    const parsedDiagnosis = JSON.parse(response.text || '{}');
    parsedDiagnosis.id = 'gemini-' + Date.now();
    parsedDiagnosis.file = parsedDiagnosis.file || fileName;

    res.status(200).json({ success: true, diagnosis: parsedDiagnosis });
  } catch (err: any) {
    res.status(200).json({ success: false, error: err.message, fallback: true });
  }
}
