import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { FileTabs } from './components/FileTabs';
import { CodeEditor } from './components/CodeEditor';
import { TerminalPanel } from './components/TerminalPanel';
import { CompilerSettingsModal } from './components/CompilerSettingsModal';
import { ExamplesModal } from './components/ExamplesModal';
import { AssemblyModal } from './components/AssemblyModal';
import { SourceFile, CompilerOptions, RunResult, ExampleTemplate } from './types';
import { EXAMPLES } from './data/examples';
import { Columns, Rows } from 'lucide-react';
import {
  checkBackendAvailability,
  executeCCode,
  generateAssembly,
  getAiAssistance,
  EngineMode,
} from './utils/cRunner';

const STORAGE_KEY_FILES = 'c_ide_files_v1';
const STORAGE_KEY_OPTIONS = 'c_ide_options_v1';
const STORAGE_KEY_STDIN = 'c_ide_stdin_v1';

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

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);

  // Assembly state
  const [assemblyCode, setAssemblyCode] = useState<string | null>(null);
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(false);

  // AI Assistant state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

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
        ? `#ifndef ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n#define ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n\n// Definições de cabeçalho\n\n#endif\n`
        : `#include <stdio.h>\n\n// Funções auxiliares para ${name}\n`,
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

  // Run C compilation and execution
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setHighlightedLine(null);

    try {
      const { result, usedEngine } = await executeCCode(
        files,
        stdin,
        compilerOptions,
        engineMode
      );

      if (usedEngine !== engineMode) {
        setEngineMode(usedEngine);
      }

      setRunResult(result);

      // If compilation failed and we have errors, highlight the first error line
      if (!result.success && result.diagnostics.length > 0) {
        const firstErr = result.diagnostics.find((d) => d.type === 'error') || result.diagnostics[0];
        const targetFile = files.find((f) => f.name === firstErr.file);
        if (targetFile) {
          setActiveFileId(targetFile.id);
        }
        setHighlightedLine(firstErr.line);
      }
    } catch (err: any) {
      setRunResult({
        success: false,
        phase: 'compilation',
        compiler: compilerOptions.compiler,
        compileOutput: `Erro ao processar execução: ${err.message}`,
        compilationTimeMs: 0,
        stdout: '',
        stderr: '',
        exitCode: -1,
        diagnostics: [],
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, compilerOptions, files, stdin, engineMode]);

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
      setHighlightedLine(null);
      setAssemblyCode(null);
      setAiResponse(null);
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
    setHighlightedLine(null);
    setAssemblyCode(null);
    setAiResponse(null);
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

  // Ask AI Assistant
  const handleAskAi = async (type: 'explain-error' | 'explain-code' | 'optimize') => {
    if (isLoadingAi) return;
    setIsLoadingAi(true);
    setAiResponse(null);
    try {
      const outputText = runResult
        ? runResult.compileOutput || runResult.stderr || runResult.stdout
        : '';
      const responseText = await getAiAssistance(activeFile.content, outputText, type);
      setAiResponse(responseText);
    } catch (err: any) {
      setAiResponse(`Erro: ${err.message}`);
    } finally {
      setIsLoadingAi(false);
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        isRunning={isRunning}
        onRun={handleRun}
        onReset={handleReset}
        onNewFile={() => handleAddFile('arquivo_' + (files.length + 1) + '.c')}
        onOpenExamples={() => setIsExamplesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAssembly={() => {
          setIsAssemblyOpen(true);
          if (!assemblyCode) handleFetchAssembly();
        }}
        onOpenAiAssist={() => {
          handleAskAi('explain-code');
        }}
        onDownloadProject={handleDownloadProject}
        compilerOptions={compilerOptions}
        engineMode={engineMode}
      />

      {/* Editor & Console Work Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sub-bar: Tabs & Layout View Controls */}
        <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 pr-3">
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

          {/* Orientation Toggle Button */}
          <div className="flex items-center space-x-1 pl-2">
            <button
              onClick={() => setSplitOrientation(splitOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs hidden md:flex items-center space-x-1"
              title={splitOrientation === 'horizontal' ? 'Mudar para layout vertical (empilhado)' : 'Mudar para layout horizontal (lado a lado)'}
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
              splitOrientation === 'horizontal' ? 'w-full md:w-3/5 h-1/2 md:h-full border-r border-slate-800' : 'w-full h-3/5 border-b border-slate-800'
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
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Nenhum arquivo aberto.
              </div>
            )}
          </div>

          {/* Terminal and I/O Panel */}
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
              onClearOutput={() => setRunResult(null)}
              onSelectDiagnosticLine={handleSelectDiagnosticLine}
              assemblyCode={assemblyCode}
              isLoadingAssembly={isLoadingAssembly}
              onFetchAssembly={handleFetchAssembly}
              onAskAi={handleAskAi}
              aiResponse={aiResponse}
              isLoadingAi={isLoadingAi}
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
    </div>
  );
}
