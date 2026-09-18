import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Terminal,
  Keyboard,
  AlertCircle,
  AlertTriangle,
  Cpu,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Clock,
  ArrowRight,
  CornerDownLeft,
  RotateCcw,
} from 'lucide-react';
import { RunResult, SourceFile, AIDiagnosis } from '../types';
import { formatDuration } from '../utils/parser';
import { AIDiagnosisPanel } from './AIDiagnosisPanel';
import { detectStdinRequirements, interleaveStdoutAndStdin } from '../utils/stdinHelper';

interface TerminalPanelProps {
  runResult: RunResult | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (val: string) => void;
  onClearOutput: () => void;
  onSelectDiagnosticLine: (file: string, line: number) => void;
  assemblyCode: string | null;
  isLoadingAssembly: boolean;
  onFetchAssembly: () => void;
  // AI Diagnostics
  diagnosis: AIDiagnosis | null;
  isLoadingDiagnosis: boolean;
  activeFile: SourceFile;
  onApplyFix: (fixedCode: string, fileName?: string) => void;
  onRequestReanalysis: (customQuestion?: string) => void;
  activeTab: 'output' | 'stdin' | 'diagnostics' | 'assembly' | 'ai';
  onTabChange: (tab: 'output' | 'stdin' | 'diagnostics' | 'assembly' | 'ai') => void;
  // Interactive execution props
  files?: SourceFile[];
  onRun?: (overrideStdin?: string, skipInputPrompt?: boolean) => void | Promise<void>;
  isAwaitingInput?: boolean;
  onCancelAwaitingInput?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  runResult,
  isRunning,
  stdin,
  onStdinChange,
  onClearOutput,
  onSelectDiagnosticLine,
  assemblyCode,
  isLoadingAssembly,
  onFetchAssembly,
  diagnosis,
  isLoadingDiagnosis,
  activeFile,
  onApplyFix,
  onRequestReanalysis,
  activeTab,
  onTabChange,
  files,
  onRun,
  isAwaitingInput = false,
  onCancelAwaitingInput,
}) => {
  const [copied, setCopied] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [showStdinBox, setShowStdinBox] = useState<boolean>(false);

  const safeStdin = typeof stdin === 'string' ? stdin : '';

  const inputRef = useRef<HTMLInputElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  const diagnostics = runResult?.diagnostics || [];
  const errorCount = diagnostics.filter((d) => d.type === 'error').length;
  const warningCount = diagnostics.filter((d) => d.type === 'warning').length;
  const hasExecutionError =
    runResult && (!runResult.success || (runResult.exitCode !== 0 && runResult.exitCode !== null));

  // Detect if C code has scanf, getchar, fgets, cin, etc.
  const stdinReq = useMemo(
    () => detectStdinRequirements(files && files.length > 0 ? files : activeFile ? [activeFile] : []),
    [files, activeFile]
  );

  // Auto-focus the console input bar when awaiting input or switching to output tab
  useEffect(() => {
    if (activeTab === 'output' && (isAwaitingInput || stdinReq.requiresInput)) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isAwaitingInput, stdinReq.requiresInput]);

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [runResult, isRunning, isAwaitingInput]);

  const handleCopyOutput = () => {
    const textToCopy = (runResult?.stdout || '') + (runResult?.stderr ? '\n' + runResult.stderr : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle submitting user input in the console
  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = consoleInput.trim();

    const currentStdin = typeof stdin === 'string' ? stdin : '';

    // If awaiting input and user presses Enter with empty, run with empty (EOF)
    if (isAwaitingInput && !val && !currentStdin.trim()) {
      if (onRun) onRun('', true);
      return;
    }

    if (!val && !currentStdin.trim()) return;

    if (val) {
      setInputHistory((prev) => [...prev.filter((h) => h !== val), val]);
      setHistoryPointer(-1);
    }

    const newStdin = val || currentStdin;
    onStdinChange(newStdin);
    setConsoleInput('');

    if (onRun) {
      onRun(newStdin, true);
    }
  };

  // Keyboard navigation for command history in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length === 0) return;
      const nextIdx = historyPointer === -1 ? inputHistory.length - 1 : Math.max(0, historyPointer - 1);
      setHistoryPointer(nextIdx);
      setConsoleInput(inputHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPointer === -1) return;
      const nextIdx = historyPointer + 1;
      if (nextIdx >= inputHistory.length) {
        setHistoryPointer(-1);
        setConsoleInput('');
      } else {
        setHistoryPointer(nextIdx);
        setConsoleInput(inputHistory[nextIdx]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-t border-slate-800 font-mono text-xs select-text">
      {/* Panel Tab Header - OnlineGDB style */}
      <div className="bg-[#161b22] border-b border-slate-800 px-3 py-1.5 flex items-center justify-between select-none">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          {/* Console Tab */}
          <button
            id="tab-terminal-output"
            onClick={() => onTabChange('output')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'output'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console</span>
            {runResult ? (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  runResult.success ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            ) : null}
          </button>

          {/* AI Diagnosis Tab (Highlighted with badge) */}
          <button
            id="tab-terminal-ai"
            onClick={() => onTabChange('ai')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'ai'
                ? 'bg-slate-800 text-amber-300 font-semibold border border-amber-500/30'
                : diagnosis?.hasError || hasExecutionError
                ? 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Diagnóstico IA</span>
            {diagnosis?.hasError && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-900 text-rose-200 font-bold">
                1 Erro
              </span>
            )}
          </button>

          {/* Stdin Tab */}
          <button
            id="tab-terminal-stdin"
            onClick={() => onTabChange('stdin')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'stdin'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Entrada (stdin)</span>
            {Boolean(safeStdin.trim()) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </button>

          {/* Diagnostics Tab */}
          <button
            id="tab-terminal-diagnostics"
            onClick={() => onTabChange('diagnostics')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Erros GCC</span>
            <span className="sm:hidden">GCC</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  errorCount > 0
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {errorCount > 0 ? `${errorCount}E` : `${warningCount}W`}
              </span>
            )}
          </button>

          {/* Assembly Tab */}
          <button
            id="tab-terminal-assembly"
            onClick={() => {
              onTabChange('assembly');
              if (!assemblyCode) onFetchAssembly();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'assembly'
                ? 'bg-slate-800 text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Assembly x86_64</span>
            <span className="md:hidden">ASM</span>
          </button>
        </div>

        {/* Action Controls and Stats */}
        <div className="flex items-center space-x-2">
          {runResult && (
            <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-400 font-sans">
              <span className="flex items-center space-x-1 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  Comp: {formatDuration(runResult.compilationTimeMs)} | Exec: {formatDuration(runResult.executionTimeMs)}
                </span>
              </span>

              {runResult.exitCode !== null && (
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
                    runResult.exitCode === 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  exit {runResult.exitCode}
                </span>
              )}
            </div>
          )}

          {/* OnlineGDB-style Standard Input Toggle */}
          <button
            type="button"
            onClick={() => setShowStdinBox(!showStdinBox)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans transition-colors border ${
              showStdinBox || Boolean(safeStdin.trim())
                ? 'bg-blue-950/70 border-blue-700 text-blue-300 font-medium'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Alternar caixa de Entrada Padrão (stdin) como no OnlineGDB"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Entrada (stdin)</span>
            <span className="sm:hidden">stdin</span>
            {Boolean(safeStdin.trim()) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </button>

          {/* Copy Button */}
          {runResult && (runResult.stdout || runResult.stderr) && (
            <button
              onClick={handleCopyOutput}
              title="Copiar saída do terminal"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Clear Console Output */}
          <button
            onClick={() => {
              onClearOutput();
              if (onCancelAwaitingInput) onCancelAwaitingInput();
            }}
            title="Limpar console"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Output / Console Tab View */}
        {activeTab === 'output' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* OnlineGDB-style Standard Input Collapsible Drawer */}
            {showStdinBox && (
              <div className="bg-[#161b22] border-b border-slate-800 p-2.5 space-y-1.5 flex-shrink-0 animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between text-xs text-slate-300 font-sans">
                  <span className="flex items-center gap-1.5 font-semibold text-blue-400">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Entrada Padrão (Standard Input / stdin)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {Boolean(safeStdin.trim()) && (
                      <button
                        type="button"
                        onClick={() => onStdinChange('')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowStdinBox(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ✕ Fechar
                    </button>
                  </div>
                </div>
                <textarea
                  value={safeStdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  placeholder="Digite aqui as entradas do programa para o scanf (números ou textos separados por espaço ou linhas, estilo OnlineGDB)..."
                  rows={3}
                  className="w-full bg-[#0d1117] border border-slate-700/80 rounded p-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-blue-500 outline-none resize-y"
                />
                <p className="text-[10px] text-slate-400 font-sans">
                  Dica: Valores preenchidos aqui serão enviados automaticamente para o <code className="text-blue-300 font-mono">scanf()</code> quando você clicar em Executar (F9).
                </p>
              </div>
            )}

            {/* Scrollable Terminal Output Screen */}
            <div
              ref={outputScrollRef}
              onClick={() => inputRef.current?.focus()}
              className="flex-1 p-3 space-y-3 overflow-y-auto font-mono text-[12px] leading-relaxed cursor-text"
            >
              {/* Running Spinner */}
              {isRunning && (
                <div className="flex items-center space-x-2 text-amber-400 py-2 font-sans">
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Compilando com GCC e executando binário ELF...</span>
                </div>
              )}

              {/* Error Notification Alert Banner */}
              {hasExecutionError && (
                <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-2.5 flex items-center justify-between gap-2 font-sans">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="text-xs text-rose-200 font-medium">
                      {runResult?.phase === 'compilation'
                        ? 'Erro de compilação detectado no código C!'
                        : 'O programa finalizou com erro de execução!'}
                    </span>
                  </div>
                  <button
                    onClick={() => onTabChange('ai')}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ver Diagnóstico & Correção da IA</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              )}

              {/* Ready / Idle state */}
              {!isRunning && !runResult && (
                <div className="text-slate-500 py-8 font-sans text-center space-y-2 select-none">
                  <p className="font-semibold text-slate-300">Console GCC OnlineGDB pronto para execução.</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700 font-mono font-bold">F9</kbd> ou clique no botão <strong className="text-emerald-400">Executar</strong>.
                    <br />
                    Para programas com <code className="text-blue-400 font-mono">scanf()</code>, você pode digitar os dados na aba <strong className="text-blue-300">Entrada (stdin)</strong> ou digitar no prompt do console abaixo.
                  </p>
                </div>
              )}

              {/* Run Results Output */}
              {runResult && (
                <div className="space-y-2.5">
                  {/* Compilation command simulated strip */}
                  <div className="text-slate-500 text-[11px] pb-1 border-b border-slate-800/80 flex items-center justify-between font-mono select-none">
                    <span>$ gcc -std=c11 -O0 -Wall -Wextra {activeFile?.name || 'main.c'} -lm && ./a.out</span>
                    <span className="text-slate-600">{(runResult?.compiler || 'gcc').toUpperCase()} 64-bit</span>
                  </div>

                  {/* Compiler Diagnostics Output if Warnings/Errors */}
                  {runResult.compileOutput && (
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-slate-300">
                      {runResult.compileOutput}
                    </div>
                  )}

                  {/* Program stdout with interleaved user input */}
                  {runResult.stdout ? (
                    <div className="bg-slate-950 p-3 rounded border border-slate-800/60 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                      {interleaveStdoutAndStdin(runResult.stdout || '', safeStdin).map((seg, idx) =>
                        seg.type === 'stdin' ? (
                          <span key={idx} className="text-cyan-300 font-bold underline decoration-cyan-500/40">
                            {seg.text}
                          </span>
                        ) : (
                          <span key={idx} className="text-slate-100">
                            {seg.text}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}

                  {/* Program stderr */}
                  {runResult.stderr && (
                    <div className="text-rose-400 whitespace-pre-wrap font-mono text-[12px] bg-rose-950/20 p-2.5 rounded border border-rose-900/50">
                      {runResult.stderr}
                    </div>
                  )}

                  {/* Process termination line (Classic OnlineGDB style) */}
                  <div className="text-slate-500 text-[11px] pt-2 border-t border-slate-800/60 font-mono flex items-center justify-between">
                    <div>
                      --------------------------------
                      <br />
                      Process returned {runResult.exitCode ?? 0} (0x{((runResult.exitCode ?? 0) >>> 0).toString(16).toUpperCase()}) &nbsp;
                      execution time : {formatDuration(runResult.executionTimeMs)}
                    </div>
                    {Boolean(safeStdin.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          onStdinChange('');
                          if (onRun) onRun('', true);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-sans transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Limpar Entrada</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Console Input Bar (Always accessible in Console tab) */}
            <form
              onSubmit={handleSendInput}
              className="flex items-center gap-2 px-3 py-2 bg-[#121822] border-t border-slate-800 select-none flex-shrink-0"
            >
              {/* Terminal prompt symbol */}
              <div className="flex items-center text-emerald-400 font-mono font-bold text-xs pl-1">
                <span>$</span>
                <span className="text-slate-600 mx-1.5">|</span>
              </div>

              {/* Input text field */}
              <input
                ref={inputRef}
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Inserir entrada (stdin) para o programa e tecle Enter..."
                className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none transition-colors"
              />

              {/* Quick toggle for standard input drawer if not open */}
              {!showStdinBox && (
                <button
                  type="button"
                  onClick={() => setShowStdinBox(true)}
                  className="hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors font-sans"
                  title="Abrir caixa de texto de Entrada Padrão (stdin)"
                >
                  <Keyboard className="w-3 h-3" />
                  <span>+ stdin</span>
                </button>
              )}

              {/* Clear button if stdin has value */}
              {Boolean(safeStdin.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    onStdinChange('');
                    setConsoleInput('');
                  }}
                  title="Limpar entrada armazenada"
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-sans"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isRunning || (!consoleInput.trim() && !safeStdin.trim())}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Enviar</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* AI Diagnosis Tab View */}
        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto">
            <AIDiagnosisPanel
              diagnosis={diagnosis}
              isLoading={isLoadingDiagnosis}
              activeFile={activeFile}
              onApplyFix={onApplyFix}
              onJumpToLine={(file, line) => onSelectDiagnosticLine(file || activeFile.name, line || 1)}
              onRequestReanalysis={onRequestReanalysis}
            />
          </div>
        )}

        {/* Stdin Tab View */}
        {activeTab === 'stdin' && (
          <div className="p-3 h-full flex flex-col space-y-2 overflow-y-auto">
            <div className="text-xs text-slate-400 font-sans flex items-center justify-between">
              <span>
                Entrada Padrão (Passada para <code className="text-blue-400 font-mono">scanf()</code>, <code className="text-blue-400 font-mono">fgets()</code>, <code className="text-blue-400 font-mono">getchar()</code>):
              </span>
              <button
                onClick={() => onStdinChange('')}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-sans"
              >
                Limpar Entrada
              </button>
            </div>
            <textarea
              value={safeStdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Digite aqui as entradas do seu programa, separadas por espaços ou linhas (ex: 42 100)..."
              className="w-full flex-1 min-h-[140px] bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-[11px] text-slate-500 font-sans">
              Dica: Você também pode digitar diretamente na aba <strong className="text-emerald-400">Console</strong> no rodapé da tela quando o programa pedir entrada via scanf!
            </p>
          </div>
        )}

        {/* Diagnostics Tab View */}
        {activeTab === 'diagnostics' && (
          <div className="p-3 space-y-2 overflow-y-auto flex-1">
            {diagnostics.length === 0 ? (
              <div className="text-slate-500 py-8 text-center font-sans">
                <p className="text-emerald-400 font-medium">Nenhum aviso ou erro no momento.</p>
                <p className="text-xs text-slate-600 mt-1">O código compilou limpo sem diagnósticos pendentes.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.map((diag, index) => (
                  <div
                    key={index}
                    onClick={() => onSelectDiagnosticLine(diag.file, diag.line)}
                    className={`p-2.5 rounded border cursor-pointer transition-colors flex items-start space-x-2 ${
                      diag.type === 'error'
                        ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/50'
                        : 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-950/50'
                    }`}
                  >
                    {diag.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <span className="font-semibold text-slate-200">
                          {diag.file}:{diag.line}{diag.col ? `:${diag.col}` : ''}
                        </span>
                        <span
                          className={`uppercase text-[10px] px-1 rounded ${
                            diag.type === 'error' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                          }`}
                        >
                          {diag.type}
                        </span>
                      </div>
                      <p className="text-slate-300 font-mono text-[12px] mt-0.5 break-words">{diag.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assembly Tab View */}
        {activeTab === 'assembly' && (
          <div className="p-3 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-sans">
                Código Assembly gerado via <code className="text-purple-400 font-mono">gcc -S -fverbose-asm -O2</code>:
              </span>
              <button
                onClick={onFetchAssembly}
                disabled={isLoadingAssembly}
                className="text-xs text-purple-400 hover:text-purple-300 font-sans"
              >
                {isLoadingAssembly ? 'Gerando...' : 'Atualizar Assembly'}
              </button>
            </div>
            {isLoadingAssembly ? (
              <div className="flex items-center space-x-2 text-purple-400 py-4 font-sans">
                <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Gerando representação x86_64...</span>
              </div>
            ) : assemblyCode ? (
              <pre className="text-slate-300 text-[11px] leading-relaxed whitespace-pre font-mono bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto">
                {assemblyCode}
              </pre>
            ) : (
              <div className="text-slate-500 py-8 font-sans text-center">
                Clique em "Atualizar Assembly" para inspecionar as instruções de máquina x86_64 geradas pelo GCC.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
