// Vercel Serverless Function for /api/compile-run
// Proxies code compilation to the Cloud GCC compiler when executed in serverless environments
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

  const { files = [], stdin = '', standard = 'c11', optimization = '-O0' } = req.body || {};

  // Simple inlining for multi-file C
  const headers = files.filter((f: any) => f.name.endsWith('.h'));
  const cFiles = files.filter((f: any) => f.name.endsWith('.c'));
  const mainFile = cFiles.find((f: any) => /int\s+main\s*\(/.test(f.content)) || cFiles[0] || files[0];
  const otherCFiles = cFiles.filter((f: any) => f !== mainFile);

  const cleanInternalIncludes = (code: string) => {
    return code.replace(/#include\s+["<]([^">]+)[">]/g, (match, inc) => {
      if (files.some((f: any) => f.name === inc)) {
        return `/* inlined: ${inc} */`;
      }
      return match;
    });
  };

  let combined = '';
  for (const h of headers) combined += cleanInternalIncludes(h.content) + '\n\n';
  for (const c of otherCFiles) combined += cleanInternalIncludes(c.content) + '\n\n';
  if (mainFile) combined += cleanInternalIncludes(mainFile.content) + '\n';

  try {
    const godboltRes = await fetch('https://godbolt.org/api/compiler/cg131/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        source: combined,
        options: {
          userArguments: `-std=${standard} ${optimization} -Wall -Wextra -lm`,
          executeParameters: { args: [], stdin: stdin || '' },
          compilerOptions: { executorRequest: true },
        },
        allowExecutions: true,
      }),
    });

    const data = await godboltRes.json();
    let compileOutput = '';
    if (data.buildResult && Array.isArray(data.buildResult.stderr)) {
      compileOutput = data.buildResult.stderr
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
    }

    let stdout = '';
    if (Array.isArray(data.stdout)) {
      stdout = data.stdout
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
    }

    let stderr = '';
    if (Array.isArray(data.stderr)) {
      stderr = data.stderr
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('\n');
    }

    const didExecute = Boolean(data.didExecute);
    res.status(200).json({
      success: didExecute && data.code === 0,
      phase: didExecute ? 'execution' : 'compilation',
      compiler: 'gcc',
      compileOutput,
      compilationTimeMs: data.buildResult?.execTime || 120,
      stdout,
      stderr,
      exitCode: data.code !== undefined ? data.code : didExecute ? 0 : 1,
      timedOut: Boolean(data.timedOut),
      executionTimeMs: 15,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      phase: 'compilation',
      compiler: 'gcc',
      compileOutput: `Erro de execução: ${err.message}`,
      compilationTimeMs: 0,
      stdout: '',
      stderr: '',
      exitCode: -1,
    });
  }
}
