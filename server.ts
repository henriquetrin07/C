import express from "express";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Helper to check compiler availability
async function checkCompiler(name: string): Promise<boolean> {
  try {
    await execFileAsync("which", [name]);
    return true;
  } catch {
    return false;
  }
}

// Health check and compiler status
app.get("/api/health", async (_req, res) => {
  const hasGcc = await checkCompiler("gcc");
  const hasTcc = await checkCompiler("tcc");
  res.json({
    status: "ok",
    compilers: {
      gcc: hasGcc,
      tcc: hasTcc,
    },
  });
});

interface FileItem {
  name: string;
  content: string;
}

// Sanitize filename to avoid path traversal
function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "main.c";
}

// Endpoint to compile and run C code
app.post("/api/compile-run", async (req, res) => {
  const files: FileItem[] = req.body.files || [
    { name: "main.c", content: req.body.code || "" },
  ];
  const stdin: string = typeof req.body.stdin === "string" ? req.body.stdin : "";
  const compilerChoice: string = req.body.compiler === "tcc" ? "tcc" : "gcc";
  const standard: string = req.body.standard || "c11"; // c89, c99, c11, c17
  const optimization: string = req.body.optimization || "-O0";
  const customFlags: string[] = Array.isArray(req.body.flags) ? req.body.flags : [];

  let tempDir = "";
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "c_ide_"));

    // Write all source and header files
    const sourceFiles: string[] = [];
    for (const file of files) {
      const safeName = sanitizeFilename(file.name);
      const filePath = path.join(tempDir, safeName);
      await fs.writeFile(filePath, file.content, "utf8");
      if (safeName.endsWith(".c")) {
        sourceFiles.push(safeName);
      }
    }

    if (sourceFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nenhum arquivo de código C (.c) encontrado para compilar.",
      });
    }

    const outBinary = path.join(tempDir, "program_bin");

    // Build compiler arguments
    const compileArgs: string[] = [];
    if (compilerChoice === "gcc") {
      compileArgs.push(`-std=${standard}`);
      if (optimization) compileArgs.push(optimization);
      compileArgs.push("-Wall", "-Wextra");
      // Add custom flags if valid
      for (const flag of customFlags) {
        if (typeof flag === "string" && flag.startsWith("-") && flag.length < 30) {
          compileArgs.push(flag);
        }
      }
      // Math library
      compileArgs.push("-lm");
    } else {
      // tcc
      compileArgs.push("-lm");
    }

    // Add source files and output binary
    compileArgs.push(...sourceFiles);
    compileArgs.push("-o", outBinary);

    const compileStart = Date.now();
    let compileOutput = "";
    let compileSuccess = true;

    try {
      const compileProc = await execFileAsync(compilerChoice, compileArgs, {
        cwd: tempDir,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      compileOutput = (compileProc.stderr || compileProc.stdout || "").trim();
    } catch (err: any) {
      compileSuccess = false;
      compileOutput = (err.stderr || err.stdout || err.message || "Erro desconhecido na compilação.").trim();
    }

    const compilationTimeMs = Date.now() - compileStart;

    if (!compileSuccess) {
      return res.json({
        success: false,
        phase: "compilation",
        compiler: compilerChoice,
        compileOutput,
        compilationTimeMs,
        stdout: "",
        stderr: "",
        exitCode: 1,
      });
    }

    // Execute the compiled program
    const execStart = Date.now();
    const runResult = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number | null;
      timedOut: boolean;
    }>((resolve) => {
      let timedOut = false;
      let stdoutBuf = "";
      let stderrBuf = "";
      const maxOutputBytes = 512 * 1024; // 512KB cap

      const proc = spawn(outBinary, [], {
        cwd: tempDir,
        env: {
          PATH: process.env.PATH,
          LANG: "pt_BR.UTF-8",
          LC_ALL: "C.UTF-8",
        },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
      }, 6000); // 6 seconds execution limit

      if (stdin) {
        try {
          proc.stdin.write(stdin);
          proc.stdin.end();
        } catch {
          // ignore stdin pipe errors if process exits immediately
        }
      } else {
        try {
          proc.stdin.end();
        } catch {}
      }

      proc.stdout.on("data", (chunk: Buffer) => {
        if (stdoutBuf.length < maxOutputBytes) {
          stdoutBuf += chunk.toString("utf8");
          if (stdoutBuf.length >= maxOutputBytes) {
            stdoutBuf += "\n[Aviso: Saída padrão truncada ao limite de 512KB]";
            proc.kill("SIGTERM");
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        if (stderrBuf.length < maxOutputBytes) {
          stderrBuf += chunk.toString("utf8");
          if (stderrBuf.length >= maxOutputBytes) {
            stderrBuf += "\n[Aviso: Saída de erro truncada ao limite de 512KB]";
            proc.kill("SIGTERM");
          }
        }
      });

      proc.on("close", (code, signal) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf + (signal ? `\nProcesso finalizado pelo sinal: ${signal}` : ""),
          exitCode: code !== null ? code : (signal ? 128 : 0),
          timedOut,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf + `\nErro ao executar processo: ${err.message}`,
          exitCode: -1,
          timedOut,
        });
      });
    });

    const executionTimeMs = Date.now() - execStart;

    res.json({
      success: !runResult.timedOut && runResult.exitCode === 0,
      phase: "execution",
      compiler: compilerChoice,
      compileOutput,
      compilationTimeMs,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode,
      timedOut: runResult.timedOut,
      executionTimeMs,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Erro interno no servidor de compilação.",
    });
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
});

// Endpoint to inspect generated x86_64 assembly code
app.post("/api/assembly", async (req, res) => {
  const code = req.body.code || "";
  const standard = req.body.standard || "c11";
  const optimization = req.body.optimization || "-O2";

  let tempDir = "";
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "c_asm_"));
    const srcFile = path.join(tempDir, "source.c");
    const asmFile = path.join(tempDir, "source.s");

    await fs.writeFile(srcFile, code, "utf8");

    try {
      await execFileAsync("gcc", [
        `-std=${standard}`,
        optimization,
        "-S",
        "-fverbose-asm",
        "-Wall",
        srcFile,
        "-o",
        asmFile,
      ]);
      const asmContent = await fs.readFile(asmFile, "utf8");
      res.json({ success: true, assembly: asmContent });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.stderr || err.stdout || err.message,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
});

// Endpoint for AI Code Assistance (explanation, fix suggestion)
app.post("/api/ai-assist", async (req, res) => {
  const { code, output, type = "explain" } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Provide built-in heuristic analysis when API key is not configured
    let fallback = "";
    if (type === "explain-error") {
      fallback = "Dica: Para habilitar explicações com inteligência artificial contextualizada, configure a GEMINI_API_KEY nas Configurações.\n\nVerifique os pontos comuns em C:\n1. Ponto e vírgula esquecido (;) no final de comandos ou structs.\n2. Incompatibilidade em printf/scanf (ex: usar %d para float ou esquecer & no scanf).\n3. Ponteiro nulo ou acesso fora dos limites do array (Segmentation Fault).\n4. Inclusão dos headers necessários (#include <stdio.h>, #include <stdlib.h>, #include <string.h>).";
    } else {
      fallback = "Dica: A chave GEMINI_API_KEY não foi configurada. O compilador GCC e TCC nativos estão funcionando 100% com execução em tempo real.";
    }
    return res.json({ success: true, text: fallback, fallback: true });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    let prompt = "";
    if (type === "explain-error") {
      prompt = `Você é um tutor especialista em linguagem C dentro de uma IDE web moderna.
O usuário compilou o seguinte código C:
\`\`\`c
${code}
\`\`\`

E recebeu a seguinte saída/erro do compilador ou execução:
\`\`\`
${output}
\`\`\`

Explique de forma didática, clara e em Português:
1. O que significa o erro e em qual linha/função ocorreu.
2. Por que esse erro aconteceu na linguagem C (conceito técnico: tipos, ponteiros, sintaxe, etc.).
3. Como corrigir com o trecho de código exato corrigido.`;
    } else if (type === "explain-code") {
      prompt = `Você é um instrutor especialista em linguagem C.
Analise o código C a seguir e faça uma explicação didática em Português sobre como ele funciona, sua complexidade algorítmica e boas práticas:
\`\`\`c
${code}
\`\`\``;
    } else if (type === "optimize") {
      prompt = `Você é um engenheiro de sistemas especialista em linguagem C de alta performance.
Analise o seguinte código C e sugira otimizações de memória, CPU, algoritmos e boas práticas de padrões C moderno:
\`\`\`c
${code}
\`\`\``;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`C IDE Server running on http://localhost:${PORT}`);
  });
}

startServer();
