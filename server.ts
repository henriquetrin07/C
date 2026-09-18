import express from "express";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  initDatabase,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserProjects,
  createProject,
  updateProject,
  deleteProject,
} from "./server/db";

dotenv.config();

const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Authentication middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Não autenticado" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: "Sessão expirada ou token inválido" });
  }
  (req as any).user = payload;
  next();
}

// Optional Auth (doesn't fail if no token, but attaches user if present)
function optionalAuthMiddleware(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  next();
}

// Auth Endpoints (Apenas usuário e senha)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ success: false, error: "O nome de usuário deve ter pelo menos 3 caracteres." });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ success: false, error: "A senha deve ter pelo menos 4 caracteres." });
    }
    const cleanUsername = username.trim();
    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({ success: false, error: "Nome de usuário já existe. Escolha outro ou entre com sua senha." });
    }
    const newUser = await createUser(cleanUsername, password);
    const token = generateToken(newUser);
    res.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Informe usuário e senha para entrar." });
    }
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, error: "Usuário ou senha incorretos." });
    }
    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Usuário ou senha incorretos." });
    }
    const token = generateToken(user);
    res.json({
      success: true,
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }
    res.json({
      success: true,
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Projects Endpoints
app.get("/api/projects", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const projects = await getUserProjects(userId);
    res.json({ success: true, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/projects", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { title, name, description, files, stdin, compilerOptions } = req.body || {};
    const project = await createProject(userId, {
      title: title || name || "Projeto sem Título",
      description,
      files,
      stdin,
      compilerOptions,
    });
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/projects/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const projectId = req.params.id;
    const { title, name, description, files, stdin, compilerOptions } = req.body || {};
    const updated = await updateProject(projectId, userId, {
      title: title || name,
      description,
      files,
      stdin,
      compilerOptions,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Projeto não encontrado" });
    }
    res.json({ success: true, project: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/projects/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const projectId = req.params.id;
    const success = await deleteProject(projectId, userId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

      // Use stdbuf to disable stdout/stderr buffering, essential for interactive C programs and scanf
      const proc = spawn("stdbuf", ["-i0", "-o0", "-e0", outBinary], {
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
      }, 8000); // 8 seconds execution limit

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

// Interactive Session Management (OnlineGDB style live console)
interface InteractiveSession {
  id: string;
  proc: any;
  tempDir: string;
  compiler: string;
  compileOutput: string;
  compilationTimeMs: number;
  stdoutBuf: string;
  stderrBuf: string;
  lastReadStdoutIndex: number;
  lastReadStderrIndex: number;
  isAlive: boolean;
  exitCode: number | null;
  timedOut: boolean;
  createdAt: number;
  lastActive: number;
  timer: NodeJS.Timeout | null;
}

const interactiveSessions = new Map<string, InteractiveSession>();

function killInteractiveSession(sessionId: string) {
  const sess = interactiveSessions.get(sessionId);
  if (!sess) return;
  if (sess.timer) clearTimeout(sess.timer);
  sess.isAlive = false;
  if (sess.proc) {
    try {
      sess.proc.kill("SIGKILL");
    } catch {}
  }
  interactiveSessions.delete(sessionId);
  if (sess.tempDir) {
    fs.rm(sess.tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Clean up dead or abandoned sessions periodically (every 30 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of interactiveSessions.entries()) {
    if (now - sess.lastActive > 90000 || !sess.isAlive) {
      killInteractiveSession(id);
    }
  }
}, 30000);

// Endpoint 1: Start interactive execution
app.post("/api/interactive/start", async (req, res) => {
  const files: FileItem[] = req.body.files || [];
  const initialStdin: string = typeof req.body.stdin === "string" ? req.body.stdin : "";
  const standard = req.body.standard || "c11";
  const optimization = req.body.optimization || "-O0";
  const customFlags: string[] = Array.isArray(req.body.flags) ? req.body.flags : [];

  let tempDir = "";
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "c_interactive_"));

    // Write source files
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
    const compileArgs: string[] = [`-std=${standard}`];
    if (optimization) compileArgs.push(optimization);
    compileArgs.push("-Wall", "-Wextra");
    for (const flag of customFlags) {
      if (typeof flag === "string" && flag.startsWith("-") && flag.length < 30) {
        compileArgs.push(flag);
      }
    }
    compileArgs.push("-lm", ...sourceFiles, "-o", outBinary);

    const compileStart = Date.now();
    let compileOutput = "";
    let compileSuccess = true;

    try {
      const compileProc = await execFileAsync("gcc", compileArgs, {
        cwd: tempDir,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      compileOutput = (compileProc.stderr || compileProc.stdout || "").trim();
    } catch (err: any) {
      compileSuccess = false;
      compileOutput = (err.stderr || err.stdout || err.message || "Erro de compilação.").trim();
    }

    const compilationTimeMs = Date.now() - compileStart;

    if (!compileSuccess) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      return res.json({
        success: false,
        phase: "compilation",
        compiler: "gcc",
        compileOutput,
        compilationTimeMs,
        stdout: "",
        stderr: "",
        exitCode: 1,
      });
    }

    // Spawn process unbuffered with stdbuf
    const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const proc = spawn("stdbuf", ["-i0", "-o0", "-e0", outBinary], {
      cwd: tempDir,
      env: {
        PATH: process.env.PATH,
        LANG: "pt_BR.UTF-8",
        LC_ALL: "C.UTF-8",
      },
    });

    const session: InteractiveSession = {
      id: sessionId,
      proc,
      tempDir,
      compiler: "gcc",
      compileOutput,
      compilationTimeMs,
      stdoutBuf: "",
      stderrBuf: "",
      lastReadStdoutIndex: 0,
      lastReadStderrIndex: 0,
      isAlive: true,
      exitCode: null,
      timedOut: false,
      createdAt: Date.now(),
      lastActive: Date.now(),
      timer: null,
    };

    // Auto-kill session after 60 seconds if abandoned
    session.timer = setTimeout(() => {
      session.timedOut = true;
      killInteractiveSession(sessionId);
    }, 60000);

    proc.stdout.on("data", (chunk: Buffer) => {
      session.stdoutBuf += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      session.stderrBuf += chunk.toString("utf8");
    });

    proc.on("close", (code, signal) => {
      session.isAlive = false;
      session.exitCode = code !== null ? code : (signal ? 128 : 0);
    });

    proc.on("error", (err) => {
      session.isAlive = false;
      session.stderrBuf += `\nErro de processo: ${err.message}`;
      session.exitCode = -1;
    });

    interactiveSessions.set(sessionId, session);

    // If initial stdin was passed, feed it to the process
    if (initialStdin) {
      try {
        proc.stdin.write(initialStdin);
      } catch {}
    }

    // Wait up to 150ms for initial output (e.g. first prompt before scanf)
    await new Promise<void>((resolve) => {
      let done = false;
      const onData = () => {
        if (!done) {
          done = true;
          clearTimeout(waitTimer);
          setTimeout(resolve, 40);
        }
      };
      proc.stdout.once("data", onData);
      proc.once("close", onData);
      const waitTimer = setTimeout(() => {
        done = true;
        proc.stdout.removeListener("data", onData);
        proc.removeListener("close", onData);
        resolve();
      }, 150);
    });

    const newStdout = session.stdoutBuf.substring(session.lastReadStdoutIndex);
    session.lastReadStdoutIndex = session.stdoutBuf.length;
    const newStderr = session.stderrBuf.substring(session.lastReadStderrIndex);
    session.lastReadStderrIndex = session.stderrBuf.length;

    // If already finished and not alive, clean up after 5s
    if (!session.isAlive) {
      setTimeout(() => killInteractiveSession(sessionId), 5000);
    }

    return res.json({
      success: true,
      phase: session.isAlive ? "execution" : "idle",
      compiler: "gcc",
      sessionId,
      compileOutput,
      compilationTimeMs,
      stdout: newStdout,
      fullStdout: session.stdoutBuf,
      stderr: newStderr,
      isAlive: session.isAlive,
      exitCode: session.exitCode,
      executionTimeMs: Date.now() - session.createdAt,
    });
  } catch (err: any) {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Erro ao iniciar sessão interativa.",
    });
  }
});

// Endpoint 2: Send input to running interactive session
app.post("/api/interactive/input", async (req, res) => {
  const { sessionId, input } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: "sessionId é obrigatório." });
  }

  const session = interactiveSessions.get(sessionId);
  if (!session || !session.isAlive) {
    return res.json({
      success: false,
      sessionId,
      isAlive: false,
      stdout: "",
      stderr: "",
      exitCode: session ? session.exitCode : 0,
      error: "O processo já foi finalizado.",
    });
  }

  session.lastActive = Date.now();

  const textToSend = typeof input === "string" ? (input.endsWith("\n") ? input : input + "\n") : "\n";
  try {
    session.proc.stdin.write(textToSend);
  } catch (err: any) {
    // Process may have exited right before write
  }

  // Wait up to 180ms for process to consume input and produce output
  await new Promise<void>((resolve) => {
    let done = false;
    const onData = () => {
      if (!done) {
        done = true;
        clearTimeout(waitTimer);
        setTimeout(resolve, 40);
      }
    };
    session.proc.stdout.once("data", onData);
    session.proc.once("close", onData);
    const waitTimer = setTimeout(() => {
      done = true;
      session.proc.stdout.removeListener("data", onData);
      session.proc.removeListener("close", onData);
      resolve();
    }, 180);
  });

  const newStdout = session.stdoutBuf.substring(session.lastReadStdoutIndex);
  session.lastReadStdoutIndex = session.stdoutBuf.length;
  const newStderr = session.stderrBuf.substring(session.lastReadStderrIndex);
  session.lastReadStderrIndex = session.stderrBuf.length;

  if (!session.isAlive) {
    setTimeout(() => killInteractiveSession(sessionId), 5000);
  }

  return res.json({
    success: true,
    sessionId,
    stdout: newStdout,
    fullStdout: session.stdoutBuf,
    stderr: newStderr,
    isAlive: session.isAlive,
    exitCode: session.exitCode,
    executionTimeMs: Date.now() - session.createdAt,
  });
});

// Endpoint 3: Kill interactive session (Stop button)
app.post("/api/interactive/kill", async (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) {
    killInteractiveSession(sessionId);
  }
  return res.json({ success: true });
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

// Endpoint for AI Code Diagnosis & Correction (Detailed error breakdown, educational lesson, mental model & fix)
app.post("/api/ai-diagnose", async (req, res) => {
  const { code, fileName = "main.c", output = "", customPrompt = "" } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({ success: false, fallback: true, message: "No GEMINI_API_KEY configured" });
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Você é um professor e tutor de ciências da computação especializado em ensinar linguagem C para iniciantes do zero absoluto.
Analise o seguinte arquivo de código C ('${fileName}') e a saída do compilador/execução:

CÓDIGO FONTE:
\`\`\`c
${code}
\`\`\`

SAÍDA DO COMPILADOR / EXECUÇÃO:
\`\`\`
${output}
\`\`\`
${customPrompt ? `DÚVIDA ESPECÍFICA DO ALUNO: ${customPrompt}` : ""}

Seu objetivo não é apenas apontar o erro, mas ensinar a matéria e os fundamentos da linguagem C por trás dele.
Gere um diagnóstico pedagógico estruturado em formato JSON com os seguintes campos:
- hasError (boolean): se há algum erro ou advertência grave no código
- errorTitle (string): título curto e acolhedor (ex: "Ponto e vírgula ausente (;)", "O Segredo do Operador & no scanf", "Acesso Indevido de Memória (SegFault)")
- file (string): nome do arquivo
- line (number): número da linha onde está o erro (se detectado)
- col (number): número da coluna (se detectado, ou 1)
- whatWentWrong (string): explicação em Português simples e direto do que o aluno errou
- whyItHappened (string): explicação técnica profunda de como a linguagem C e o hardware funcionam nesse caso (pilha/stack, ponteiros, registradores, terminador '\\0', tipos)
- educationalLesson (string): lição didática em tom de professor paciente, usando uma analogia do mundo real (ex: armários escolares, receitas de bolo, endereços postais de casas)
- mentalModel (string): diagrama visual esquemático em texto/ASCII representando o que aconteceu na memória RAM (ex: [Endereço: 0x1000 | Nome: var | Valor: ???] ou [Pilha: main() -> ponteiro -> NULL])
- goldenRule (string): regra de ouro ou dica mnemônica para o aluno nunca mais errar isso na carreira
- miniQuiz (object): um pequeno quiz de 1 pergunta para o aluno testar se entendeu:
  - question (string)
  - options (array de 3 strings)
  - correctIndex (number: 0, 1 ou 2)
  - explanation (string: explicação curta do porquê a resposta certa é aquela)
- howToFix (string): instruções passo a passo de como corrigir
- originalSnippet (string): trecho do código que contém o erro
- fixedSnippet (string): trecho corrigido correspondente
- fullFixedCode (string): o arquivo de código C completo com a correção aplicada
- category (string): um de "syntax", "type_mismatch", "memory", "include", "runtime", "logic"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
            educationalLesson: { type: Type.STRING },
            mentalModel: { type: Type.STRING },
            goldenRule: { type: Type.STRING },
            miniQuiz: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ["question", "options", "correctIndex", "explanation"],
            },
            howToFix: { type: Type.STRING },
            originalSnippet: { type: Type.STRING },
            fixedSnippet: { type: Type.STRING },
            fullFixedCode: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: [
            "hasError",
            "errorTitle",
            "whatWentWrong",
            "whyItHappened",
            "howToFix",
            "category",
          ],
        },
      },
    });

    const parsedDiagnosis = JSON.parse(response.text || "{}");
    parsedDiagnosis.id = "gemini-" + Date.now();
    parsedDiagnosis.file = parsedDiagnosis.file || fileName;

    res.json({ success: true, diagnosis: parsedDiagnosis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, fallback: true });
  }
});

// Endpoint to explain code line-by-line for learners
app.post("/api/ai-explain-code", async (req, res) => {
  const { code, fileName = "main.c" } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      success: true,
      text: "Para explicações geradas com IA, adicione a GEMINI_API_KEY. O código atual usa o compilador C nativo.",
      fallback: true,
    });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Você é um professor renomado de Ciência da Computação ensinando programação C para alguém que está aprendendo do zero absoluto.
Explique de forma extremamente clara, didática e acolhedora como o seguinte programa C ('${fileName}') funciona:

\`\`\`c
${code}
\`\`\`

Estruture sua resposta assim:
1. **Visão Geral**: O que este programa faz e qual o objetivo dele na prática.
2. **Passo a Passo Linha por Linha**: Explique cada bloco ou comando essencial (#include, int main, variáveis, printf, scanf, loops, ponteiros, return 0) como se estivesse explicando para alguém no primeiro dia de faculdade.
3. **O que acontece na Memória RAM**: Explique onde cada variável é criada e o que a CPU faz.
4. **Dicas de Ouro & Boas Práticas**: Como um programador profissional de C escreveria e cuidaria desse código.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint for AI Code Assistance (explanation, fix suggestion)
app.post("/api/ai-assist", async (req, res) => {
  const { code, output, type = "explain" } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
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
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  // Initialize persistent database
  await initDatabase().catch((e) => console.error("Database init error:", e));

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
