import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { FileTabs } from './components/FileTabs';
import { CodeEditor } from './components/CodeEditor';
import { TerminalPanel } from './components/TerminalPanel';
import { CompilerSettingsModal } from './components/CompilerSettingsModal';
import { ExamplesModal } from './components/ExamplesModal';
import { AssemblyModal } from './components/AssemblyModal';
import { AuthModal } from './components/AuthModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { CurriculumModal } from './components/CurriculumModal';
import {
  SourceFile,
  CompilerOptions,
  RunResult,
  ExampleTemplate,
  AIDiagnosis,
  User,
  UserProject,
} from './types';
import { EXAMPLES } from './data/examples';
import { Columns, Rows, Check, GraduationCap, Sparkles, FolderGit2 } from 'lucide-react';
import { formatCCode } from './utils/cFormatter';
import { analyzeErrorWithAI } from './utils/aiDiagnostician';
import {
  checkBackendAvailability,
  executeCCode,
  generateAssembly,
  EngineMode,
} from './utils/cRunner';
import { DatabaseClient } from './utils/database';
import { detectStdinRequirements } from './utils/stdinHelper';

const STORAGE_KEY_FILES = 'c_ide_files_v1';
const STORAGE_KEY_OPTIONS = 'c_ide_options_v1';
const STORAGE_KEY_STDIN = 'c_ide_stdin_v1';
const STORAGE_KEY_TOKEN = 'c_ide_auth_token';

const DEFAULT_OPTIONS: CompilerOptions = {
  compiler: 'gcc',
  standard: 'c11',
  optimization: '-O0',
  enableWall: true,
  enableWextra: true,
  enablePedantic: false,
  customFlags: '-lm',
};

export default function App() {
  // Initialize files from localStorage or default
  const [files, setFiles] = useState<SourceFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return EXAMPLES[0].files;
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return files[0]?.id || 'f1';
  });

  const [stdin, setStdin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_STDIN) || '';
  });

  const [compilerOptions, setCompilerOptions] = useState<CompilerOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (saved) return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_OPTIONS;
  });

  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>('cloud');
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // Terminal active tab state ('output' | 'stdin' | 'diagnostics' | 'assembly' | 'ai')
  const [terminalTab, setTerminalTab] = useState<'output' | 'stdin' | 'diagnostics' | 'assembly' | 'ai'>('output');
  const [isAwaitingInput, setIsAwaitingInput] = useState<boolean>(false);

  // AI Diagnostic State
  const [diagnosis, setDiagnosis] = useState<AIDiagnosis | null>(null);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState<boolean>(false);

  // Toast feedback notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auth and User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  });

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);

  // Assembly state
  const [assemblyCode, setAssemblyCode] = useState<string | null>(null);
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
    } catch {}
  }, [files]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(compilerOptions));
    } catch {}
  }, [compilerOptions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STDIN, stdin);
    } catch {}
  }, [stdin]);

  // Check user session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await DatabaseClient.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setAuthToken(DatabaseClient.getToken());
        }
      } catch {
        // Safe fallback
      }
    };

    checkSession();
  }, []);

  // Check health and server readiness
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      const mode = await checkBackendAvailability();
      if (isMounted) {
        setEngineMode(mode);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const handleUpdateCode = (newCode: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newCode } : f))
    );
  };

  const handleAddFile = (name: string) => {
    const newFile: SourceFile = {
      id: 'f_' + Date.now(),
      name,
      content: name.endsWith('.h')
        ? `#ifndef ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n#define ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n\n// Definições de cabeçalho para ${name}\n\n#endif\n`
        : `#include <stdio.h>\n\n// Funções para ${name}\n`,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    if (activeFileId === id) {
      setActiveFileId(nextFiles[0].id);
    }
  };

  const handleRenameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  // Run C compilation and execution with interactive stdin support
  const handleRun = useCallback(
    async (overrideStdin?: string, skipInputPrompt?: boolean) => {
      if (isRunning) return;

      const actualStdin = overrideStdin !== undefined ? overrideStdin : stdin;
      if (overrideStdin !== undefined && overrideStdin !== stdin) {
        setStdin(overrideStdin);
      }

      // Check if C code has scanf/getchar/fgets and no stdin has been provided yet
      const stdinReq = detectStdinRequirements(files);
      if (stdinReq.requiresInput && !actualStdin.trim() && !skipInputPrompt) {
        setTerminalTab('output');
        setIsAwaitingInput(true);
        setRunResult(null);
        return;
      }

      setIsAwaitingInput(false);
      setIsRunning(true);
      setHighlightedLine(null);
      setTerminalTab('output');

      try {
        const { result, usedEngine } = await executeCCode(
          files,
          actualStdin,
          compilerOptions,
          engineMode
        );

        if (usedEngine !== engineMode) {
          setEngineMode(usedEngine);
        }

        setRunResult(result);

        // If compilation failed or runtime error occurred, automatically diagnose with AI
        const hasError =
          !result.success ||
          (result.exitCode !== 0 && result.exitCode !== null) ||
          result.timedOut;

        if (hasError) {
          setIsLoadingDiagnosis(true);
          // Highlight first error line in editor
          if (result.diagnostics.length > 0) {
            const firstErr =
              result.diagnostics.find((d) => d.type === 'error') || result.diagnostics[0];
            const targetFile = files.find((f) => f.name === firstErr.file);
            if (targetFile) {
              setActiveFileId(targetFile.id);
            }
            setHighlightedLine(firstErr.line);
          }

          analyzeErrorWithAI(activeFile, files, result)
            .then((diag) => {
              setDiagnosis(diag);
              setIsLoadingDiagnosis(false);
            })
            .catch(() => {
              setIsLoadingDiagnosis(false);
            });
        } else {
          // Successful clean run
          setDiagnosis(null);
        }
      } catch (err: any) {
        const fakeErrResult: RunResult = {
          success: false,
          phase: 'compilation',
          compiler: compilerOptions.compiler,
          compileOutput: `Erro ao processar execução: ${err.message}`,
          compilationTimeMs: 0,
          stdout: '',
          stderr: '',
          exitCode: -1,
          diagnostics: [],
        };
        setRunResult(fakeErrResult);
        setIsLoadingDiagnosis(true);
        analyzeErrorWithAI(activeFile, files, fakeErrResult)
          .then((diag) => {
            setDiagnosis(diag);
            setIsLoadingDiagnosis(false);
          })
          .catch(() => setIsLoadingDiagnosis(false));
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, compilerOptions, files, stdin, engineMode, activeFile]
  );

  // Debug action (OnlineGDB style): runs and switches straight to the AI diagnosis / inspection tab
  const handleDebug = async () => {
    setTerminalTab('ai');
    setIsLoadingDiagnosis(true);
    try {
      const { result } = await executeCCode(files, stdin, compilerOptions, engineMode);
      setRunResult(result);
      const diag = await analyzeErrorWithAI(activeFile, files, result);
      setDiagnosis(diag);
    } catch (err: any) {
      showToast('Falha na depuração: ' + err.message, 'info');
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  // Beautify action: auto-format C code
  const handleBeautify = () => {
    if (!activeFile) return;
    const formatted = formatCCode(activeFile.content);
    handleUpdateCode(formatted);
    showToast('Código C formatado ({ } Beautify)!');
  };

  // Apply AI Fix to code
  const handleApplyFix = (fixedCode: string, fileName?: string) => {
    const targetName = fileName || activeFile.name;
    setFiles((prev) =>
      prev.map((f) => (f.name === targetName ? { ...f, content: fixedCode } : f))
    );
    showToast(`Correção pedagógica aplicada em ${targetName}! Pressione F9 para compilar.`);
  };

  // Re-run AI analysis with custom question
  const handleRequestReanalysis = async (customQuestion?: string) => {
    setIsLoadingDiagnosis(true);
    setTerminalTab('ai');
    try {
      const diag = await analyzeErrorWithAI(activeFile, files, runResult, customQuestion);
      setDiagnosis(diag);
    } catch (err: any) {
      showToast('Erro ao consultar IA: ' + err.message, 'info');
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  // Global hotkeys (Ctrl+Enter, F9)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun]);

  // Reset to default example
  const handleReset = () => {
    if (window.confirm('Deseja restaurar o código padrão para o exemplo "Olá, Mundo"?')) {
      setFiles(EXAMPLES[0].files);
      setActiveFileId(EXAMPLES[0].files[0].id);
      setStdin('');
      setRunResult(null);
      setIsAwaitingInput(false);
      setHighlightedLine(null);
      setAssemblyCode(null);
      setDiagnosis(null);
    }
  };

  // Select example
  const handleSelectExample = (example: ExampleTemplate) => {
    setFiles(example.files);
    setActiveFileId(example.files[0].id);
    if (example.stdin) {
      setStdin(example.stdin);
    } else {
      setStdin('');
    }
    setRunResult(null);
    setIsAwaitingInput(false);
    setHighlightedLine(null);
    setAssemblyCode(null);
    setDiagnosis(null);
  };

  // Fetch assembly
  const handleFetchAssembly = async () => {
    if (isLoadingAssembly) return;
    setIsLoadingAssembly(true);
    try {
      const res = await generateAssembly(
        activeFile.content,
        compilerOptions.standard,
        compilerOptions.optimization
      );
      if (res.success && res.assembly) {
        setAssemblyCode(res.assembly);
      } else {
        setAssemblyCode(`// Erro ao gerar Assembly:\n${res.error || 'Falha na compilação'}`);
      }
    } catch (err: any) {
      setAssemblyCode(`// Erro:\n${err.message}`);
    } finally {
      setIsLoadingAssembly(false);
    }
  };

  // Download project files
  const handleDownloadProject = () => {
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Diagnostic line selection
  const handleSelectDiagnosticLine = (fileName: string, line: number) => {
    const file = files.find((f) => f.name === fileName);
    if (file) {
      setActiveFileId(file.id);
    }
    setHighlightedLine(line);
  };

  // Auth Callbacks
  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    showToast(`Bem-vindo, ${user.username}! Seus códigos estão salvos na sua conta.`);
  };

  const handleLogout = () => {
    DatabaseClient.clearSession();
    setCurrentUser(null);
    setAuthToken(null);
    showToast('Você saiu da sua conta. Seus códigos permanecem no navegador.', 'info');
  };

  // Load User Project
  const handleLoadProject = (project: UserProject) => {
    if (project.files && project.files.length > 0) {
      setFiles(project.files);
      setActiveFileId(project.files[0].id);
      setRunResult(null);
      setHighlightedLine(null);
      setDiagnosis(null);
      const projTitle = project.title || project.name || 'Projeto';
      showToast(`Projeto "${projTitle}" carregado com sucesso!`);
    }
  };

  // Load Lesson Code from Curriculum
  const handleLoadLessonCode = (code: string, fileName: string, suggestedStdin?: string) => {
    const existingFile = files.find((f) => f.name === fileName);
    if (existingFile) {
      setFiles((prev) =>
        prev.map((f) => (f.id === existingFile.id ? { ...f, content: code } : f))
      );
      setActiveFileId(existingFile.id);
    } else {
      const newFile: SourceFile = {
        id: 'lesson_' + Date.now(),
        name: fileName,
        content: code,
      };
      setFiles((prev) => [newFile, ...prev]);
      setActiveFileId(newFile.id);
    }

    if (suggestedStdin !== undefined) {
      setStdin(suggestedStdin);
    }

    setRunResult(null);
    setHighlightedLine(null);
    setDiagnosis(null);
    setTerminalTab('output');
    showToast(`Aula "${fileName}" carregada no editor! Pressione Run (F9) para compilar.`);
  };

  const hasActiveErrors =
    Boolean(
      runResult &&
        (!runResult.success || (runResult.exitCode !== 0 && runResult.exitCode !== null))
    ) || Boolean(diagnosis?.hasError);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-slate-100 overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-4 z-50 flex items-center space-x-2 bg-slate-900 border border-emerald-500/60 text-emerald-200 px-3.5 py-2 rounded-lg shadow-xl shadow-black/60 text-xs animate-bounce font-sans">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* OnlineGDB Style Top Navigation Bar */}
      <Navbar
        isRunning={isRunning}
        onRun={handleRun}
        onStop={() => setIsRunning(false)}
        onDebug={handleDebug}
        onBeautify={handleBeautify}
        onReset={handleReset}
        onNewFile={() => handleAddFile('arquivo_' + (files.length + 1) + '.c')}
        onOpenExamples={() => setIsExamplesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAssembly={() => {
          setTerminalTab('assembly');
          if (!assemblyCode) handleFetchAssembly();
        }}
        onOpenAiAssist={() => {
          setTerminalTab('ai');
          if (!diagnosis) {
            handleRequestReanalysis();
          }
        }}
        onDownloadProject={handleDownloadProject}
        onToggleStdin={() => setTerminalTab(terminalTab === 'stdin' ? 'output' : 'stdin')}
        onOpenCurriculum={() => setIsCurriculumOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        compilerOptions={compilerOptions}
        onChangeStandard={(std) => setCompilerOptions((prev) => ({ ...prev, standard: std }))}
        engineMode={engineMode}
        hasErrors={hasActiveErrors}
      />

      {/* Editor & Console Work Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sub-bar: Tabs & Layout View Controls */}
        <div className="flex items-center justify-between bg-[#161b22] border-b border-slate-800 pr-3">
          <div className="flex-1 min-w-0">
            <FileTabs
              files={files}
              activeFileId={activeFileId}
              onSelectFile={(id) => {
                setActiveFileId(id);
                setHighlightedLine(null);
              }}
              onAddFile={handleAddFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              diagnostics={runResult?.diagnostics || []}
            />
          </div>

          {/* Quick Learning Banner Trigger */}
          <button
            onClick={() => setIsCurriculumOpen(true)}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium mr-2 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Aprenda C do Zero</span>
          </button>

          {/* Orientation Toggle Button */}
          <div className="flex items-center space-x-1 pl-2">
            <button
              onClick={() =>
                setSplitOrientation(splitOrientation === 'horizontal' ? 'vertical' : 'horizontal')
              }
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs hidden md:flex items-center space-x-1"
              title={
                splitOrientation === 'horizontal'
                  ? 'Mudar para layout vertical (empilhado)'
                  : 'Mudar para layout horizontal (lado a lado)'
              }
            >
              {splitOrientation === 'horizontal' ? (
                <>
                  <Rows className="w-3.5 h-3.5" />
                  <span className="text-[11px] text-slate-400">Vertical</span>
                </>
              ) : (
                <>
                  <Columns className="w-3.5 h-3.5" />
                  <span className="text-[11px] text-slate-400">Lado a Lado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Workspace Split (Editor and Terminal) */}
        <div
          className={`flex-1 flex min-h-0 overflow-hidden ${
            splitOrientation === 'horizontal' ? 'flex-col md:flex-row' : 'flex-col'
          }`}
        >
          {/* Code Editor Panel */}
          <div
            className={`flex flex-col min-h-0 ${
              splitOrientation === 'horizontal'
                ? 'w-full md:w-3/5 h-1/2 md:h-full border-r border-slate-800'
                : 'w-full h-3/5 border-b border-slate-800'
            }`}
          >
            {activeFile ? (
              <CodeEditor
                code={activeFile.content}
                onChange={handleUpdateCode}
                fileName={activeFile.name}
                diagnostics={runResult?.diagnostics || []}
                onRun={handleRun}
                highlightedLine={highlightedLine}
                onOpenAiDiagnosis={() => {
                  setTerminalTab('ai');
                  if (!diagnosis) handleRequestReanalysis();
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Nenhum arquivo aberto.
              </div>
            )}
          </div>

          {/* Terminal and I/O Panel (OnlineGDB style with AI Diagnostic) */}
          <div
            className={`flex flex-col min-h-0 ${
              splitOrientation === 'horizontal' ? 'w-full md:w-2/5 h-1/2 md:h-full' : 'w-full h-2/5'
            }`}
          >
            <TerminalPanel
              runResult={runResult}
              isRunning={isRunning}
              stdin={stdin}
              onStdinChange={setStdin}
              onClearOutput={() => {
                setRunResult(null);
                setIsAwaitingInput(false);
              }}
              onSelectDiagnosticLine={handleSelectDiagnosticLine}
              assemblyCode={assemblyCode}
              isLoadingAssembly={isLoadingAssembly}
              onFetchAssembly={handleFetchAssembly}
              diagnosis={diagnosis}
              isLoadingDiagnosis={isLoadingDiagnosis}
              activeFile={activeFile}
              onApplyFix={handleApplyFix}
              onRequestReanalysis={handleRequestReanalysis}
              activeTab={terminalTab}
              onTabChange={setTerminalTab}
              files={files}
              onRun={handleRun}
              isAwaitingInput={isAwaitingInput}
              onCancelAwaitingInput={() => setIsAwaitingInput(false)}
            />
          </div>
        </div>
      </div>

      {/* Compiler Settings Modal */}
      <CompilerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={compilerOptions}
        onChangeOptions={setCompilerOptions}
      />

      {/* Examples Library Modal */}
      <ExamplesModal
        isOpen={isExamplesOpen}
        onClose={() => setIsExamplesOpen(false)}
        onSelectExample={handleSelectExample}
      />

      {/* Assembly Inspection Modal */}
      <AssemblyModal
        isOpen={isAssemblyOpen}
        onClose={() => setIsAssemblyOpen(false)}
        assemblyCode={assemblyCode}
        isLoading={isLoadingAssembly}
        onRefresh={handleFetchAssembly}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* Project Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentUser={currentUser}
        authToken={authToken}
        currentFiles={files}
        onOpenAuth={() => {
          setIsProjectsOpen(false);
          setIsAuthOpen(true);
        }}
        onLoadProject={handleLoadProject}
      />

      {/* Educational Curriculum Modal (Aprenda C do Zero) */}
      <CurriculumModal
        isOpen={isCurriculumOpen}
        onClose={() => setIsCurriculumOpen(false)}
        onLoadLessonCode={handleLoadLessonCode}
      />
    </div>
  );
}
