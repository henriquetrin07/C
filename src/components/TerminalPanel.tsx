import React, { useState } from 'react';
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
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { RunResult, SourceFile, AIDiagnosis } from '../types';
import { formatDuration } from '../utils/parser';
import { AIDiagnosisPanel } from './AIDiagnosisPanel';

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
}) => {
  const [copied, setCopied] = useState(false);

  const diagnostics = runResult?.diagnostics || [];
  const errorCount = diagnostics.filter((d) => d.type === 'error').length;
  const warningCount = diagnostics.filter((d) => d.type === 'warning').length;
  const hasExecutionError = runResult && (!runResult.success || (runResult.exitCode !== 0 && runResult.exitCode !== null));

  const handleCopyOutput = () => {
    const textToCopy = (runResult?.stdout || '') + (runResult?.stderr ? '\n' + runResult.stderr : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            {runResult && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  runResult.success ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
                }`}
              />
            )}
          </button>

          {/* AI Diagnosis Tab (Highlighted with badge) */}
          <button
            id="tab-terminal-ai"
            onClick={() => onTabChange('ai')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'ai'
                ? 'bg-slate-800 text-amber-300 font-semibold border border-amber-500/30'
                : (diagnosis?.hasError || hasExecutionError)
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
            {stdin.trim() && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
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
                  Exit: {runResult.exitCode}
                </span>
              )}

              {runResult.timedOut && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Timeout</span>
                </span>
              )}
            </div>
          )}

          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopyOutput}
              disabled={!runResult}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-30 transition-colors"
              title="Copiar saída do terminal"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClearOutput}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Limpar terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-relaxed">
        {/* Output / Console Tab View */}
        {activeTab === 'output' && (
          <div className="p-3 space-y-3">
            {/* Running Spinner */}
            {isRunning && (
              <div className="flex items-center space-x-2 text-amber-400 py-2 font-sans">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Compilando com GCC e executando binário ELF...</span>
              </div>
            )}

            {/* Error Notification Alert Banner (OnlineGDB style with instant AI diagnosis trigger) */}
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

            {!isRunning && !runResult && (
              <div className="text-slate-500 py-8 font-sans text-center space-y-2">
                <p className="font-semibold text-slate-300">Terminal OnlineGDB pronto para execução.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono">F9</kbd> ou <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono">Ctrl+Enter</kbd> para compilar e rodar.
                </p>
              </div>
            )}

            {runResult && (
              <div className="space-y-2">
                {/* OnlineGDB compilation command simulated strip */}
                <div className="text-slate-500 text-[11px] pb-1 border-b border-slate-800/80 flex items-center justify-between">
                  <span>$ gcc -std=c11 -O0 -Wall -Wextra {activeFile.name} -lm && ./a.out</span>
                  <span className="text-slate-600">{runResult.compiler.toUpperCase()} 64-bit</span>
                </div>

                {/* Compiler Diagnostics Output if Warnings/Errors */}
                {runResult.compileOutput && (
                  <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] font-sans font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Mensagens do Compilador GCC:</span>
                      </span>
                    </div>
                    <pre className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {runResult.compileOutput}
                    </pre>
                  </div>
                )}

                {/* Program stdout */}
                {runResult.stdout && (
                  <div className="text-emerald-300 whitespace-pre-wrap font-mono text-[12px] bg-slate-950/60 p-2.5 rounded border border-slate-800/40">
                    {runResult.stdout}
                  </div>
                )}

                {/* Program stderr */}
                {runResult.stderr && (
                  <div className="text-rose-400 whitespace-pre-wrap font-mono text-[12px] bg-rose-950/20 p-2.5 rounded border border-rose-900/50">
                    {runResult.stderr}
                  </div>
                )}

                {/* Process termination line (Classic OnlineGDB style) */}
                <div className="text-slate-500 text-[11px] pt-2 border-t border-slate-800/60 font-sans">
                  --------------------------------
                  <br />
                  Process returned {runResult.exitCode ?? 0} (0x{((runResult.exitCode ?? 0) >>> 0).toString(16).toUpperCase()}) &nbsp;
                  execution time : {formatDuration(runResult.executionTimeMs)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Diagnosis Tab View */}
        {activeTab === 'ai' && (
          <AIDiagnosisPanel
            diagnosis={diagnosis}
            isLoading={isLoadingDiagnosis}
            activeFile={activeFile}
            onApplyFix={onApplyFix}
            onJumpToLine={(file, line) => onSelectDiagnosticLine(file || activeFile.name, line || 1)}
            onRequestReanalysis={onRequestReanalysis}
          />
        )}

        {/* Stdin Tab View */}
        {activeTab === 'stdin' && (
          <div className="p-3 h-full flex flex-col space-y-2">
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
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Digite aqui as entradas do seu programa, separadas por espaços ou linhas (ex: 42 100)..."
              className="w-full flex-1 min-h-[140px] bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-[11px] text-slate-500 font-sans">
              Dica: Quando o código executar <code className="text-slate-400 font-mono">scanf("%d", &x)</code>, os valores inseridos acima serão lidos na ordem informada.
            </p>
          </div>
        )}

        {/* Diagnostics Tab View */}
        {activeTab === 'diagnostics' && (
          <div className="p-3 space-y-2">
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
          <div className="p-3">
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
