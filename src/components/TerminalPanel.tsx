import React, { useState } from 'react';
import { Terminal, Keyboard, AlertCircle, AlertTriangle, Cpu, Sparkles, Trash2, Copy, Check, Clock, ShieldAlert } from 'lucide-react';
import { RunResult, CompilerDiagnostic } from '../types';
import { formatDuration } from '../utils/parser';

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
  onAskAi: (type: 'explain-error' | 'explain-code' | 'optimize') => void;
  aiResponse: string | null;
  isLoadingAi: boolean;
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
  onAskAi,
  aiResponse,
  isLoadingAi,
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'stdin' | 'diagnostics' | 'assembly' | 'ai'>('output');
  const [copied, setCopied] = useState(false);

  const diagnostics = runResult?.diagnostics || [];
  const errorCount = diagnostics.filter((d) => d.type === 'error').length;
  const warningCount = diagnostics.filter((d) => d.type === 'warning').length;

  const handleCopyOutput = () => {
    const textToCopy = (runResult?.stdout || '') + (runResult?.stderr ? '\n' + runResult.stderr : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] border-t border-slate-800 font-mono text-xs select-text">
      {/* Panel Tab Header */}
      <div className="bg-slate-900 border-b border-slate-800/90 px-3 py-1.5 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {/* Output Tab */}
          <button
            id="tab-terminal-output"
            onClick={() => setActiveTab('output')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'output'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
            {runResult && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  runResult.success ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
                }`}
              />
            )}
          </button>

          {/* Stdin Tab */}
          <button
            id="tab-terminal-stdin"
            onClick={() => setActiveTab('stdin')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'stdin'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Entrada (stdin)</span>
            {stdin.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </button>

          {/* Diagnostics Tab */}
          <button
            id="tab-terminal-diagnostics"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Diagnósticos</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  errorCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
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
              setActiveTab('assembly');
              if (!assemblyCode) onFetchAssembly();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'assembly'
                ? 'bg-slate-800 text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Assembly x86_64</span>
          </button>

          {/* AI Tutor Tab */}
          <button
            id="tab-terminal-ai"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors font-sans ${
              activeTab === 'ai'
                ? 'bg-slate-800 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tutor C</span>
          </button>
        </div>

        {/* Action Controls and Stats */}
        <div className="flex items-center space-x-3">
          {runResult && (
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-400">
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
                  <span>Timeout (6s)</span>
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
      <div className="flex-1 overflow-y-auto p-3 font-mono-code text-[12px] leading-relaxed">
        {/* Output Tab View */}
        {activeTab === 'output' && (
          <div className="space-y-2">
            {isRunning && (
              <div className="flex items-center space-x-2 text-amber-400 py-2">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Compilando com {runResult?.compiler?.toUpperCase() || 'GCC'} e executando processo...</span>
              </div>
            )}

            {!isRunning && !runResult && (
              <div className="text-slate-500 py-4 font-sans text-center">
                <p className="font-medium text-slate-400">Nenhuma execução ativa no momento.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Clique em <span className="text-emerald-400 font-semibold">Executar (Ctrl+Enter)</span> acima para compilar seu código C.
                </p>
              </div>
            )}

            {runResult && (
              <div>
                {/* Compiler Output if Warnings or Errors */}
                {runResult.compileOutput && (
                  <div className="mb-3 p-2.5 rounded bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] font-sans font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span>Saída do Compilador ({runResult.compiler.toUpperCase()}):</span>
                      {errorCount > 0 && (
                        <button
                          onClick={() => onAskAi('explain-error')}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Explicar erro com Tutor C</span>
                        </button>
                      )}
                    </div>
                    <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">
                      {runResult.compileOutput}
                    </pre>
                  </div>
                )}

                {/* Program stdout */}
                {runResult.stdout && (
                  <div className="text-slate-100 whitespace-pre-wrap font-mono-code">
                    {runResult.stdout}
                  </div>
                )}

                {/* Program stderr */}
                {runResult.stderr && (
                  <div className="text-rose-400 whitespace-pre-wrap font-mono-code mt-2 border-l-2 border-rose-500 pl-2">
                    {runResult.stderr}
                  </div>
                )}

                {/* Empty Output Note */}
                {!runResult.stdout && !runResult.stderr && runResult.phase === 'execution' && (
                  <div className="text-slate-500 italic">
                    [O programa finalizou com código {runResult.exitCode} sem produzir saída para stdout]
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stdin Tab View */}
        {activeTab === 'stdin' && (
          <div className="h-full flex flex-col space-y-2">
            <div className="text-xs text-slate-400 font-sans flex items-center justify-between">
              <span>
                Entrada Padrão (Passada para <code className="text-blue-400 font-mono">scanf()</code>, <code className="text-blue-400 font-mono">fgets()</code>, <code className="text-blue-400 font-mono">getchar()</code>):
              </span>
              <button
                onClick={() => onStdinChange('')}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Limpar Entrada
              </button>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Digite aqui as entradas do seu programa, separadas por espaços ou linhas (ex: 42 100)..."
              className="w-full flex-1 min-h-[120px] bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-[11px] text-slate-500 font-sans">
              Dica: Quando o código executar <code className="text-slate-400 font-mono">scanf</code>, os valores inseridos acima serão lidos na ordem informada.
            </p>
          </div>
        )}

        {/* Diagnostics Tab View */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-2">
            {diagnostics.length === 0 ? (
              <div className="text-slate-500 py-6 text-center font-sans">
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
                        <span className="font-semibold text-slate-200">{diag.file}:{diag.line}{diag.col ? `:${diag.col}` : ''}</span>
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
          <div>
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
              <div className="flex items-center space-x-2 text-purple-400 py-4">
                <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Gerando representação x86_64...</span>
              </div>
            ) : assemblyCode ? (
              <pre className="text-slate-300 text-[11px] leading-relaxed whitespace-pre font-mono bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto">
                {assemblyCode}
              </pre>
            ) : (
              <div className="text-slate-500 py-4 font-sans text-center">
                Clique em "Atualizar Assembly" para inspecionar as instruções de máquina x86_64 geradas pelo GCC.
              </div>
            )}
          </div>
        )}

        {/* AI Tutor Tab View */}
        {activeTab === 'ai' && (
          <div className="space-y-3 font-sans">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onAskAi('explain-code')}
                disabled={isLoadingAi}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Explicar Código</span>
              </button>
              <button
                onClick={() => onAskAi('explain-error')}
                disabled={isLoadingAi || (!runResult?.compileOutput && !runResult?.stderr)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center space-x-1 disabled:opacity-40"
              >
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Explicar Erros Atuais</span>
              </button>
              <button
                onClick={() => onAskAi('optimize')}
                disabled={isLoadingAi}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center space-x-1"
              >
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>Sugerir Otimizações</span>
              </button>
            </div>

            {isLoadingAi && (
              <div className="flex items-center space-x-2 text-amber-400 py-3">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Analisando código C...</span>
              </div>
            )}

            {aiResponse && (
              <div className="bg-slate-900/90 border border-slate-800 rounded p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            )}

            {!aiResponse && !isLoadingAi && (
              <div className="text-xs text-slate-400 space-y-2 bg-slate-900/40 p-3 rounded border border-slate-800/60">
                <p className="font-semibold text-slate-300">Dicas Rápidas de Desenvolvimento em C:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li><strong className="text-slate-300">Ponteiros:</strong> Use <code className="text-amber-300 font-mono">&variavel</code> para passar o endereço de memória e <code className="text-amber-300 font-mono">*ponteiro</code> para acessar ou alterar o valor apontado.</li>
                  <li><strong className="text-slate-300">Leitura com scanf:</strong> Sempre passe o endereço de memória da variável para tipos primitivos, por exemplo: <code className="text-amber-300 font-mono">scanf("%d", &num);</code></li>
                  <li><strong className="text-slate-300">Alocação com malloc:</strong> Lembre-se de verificar se o retorno de <code className="text-amber-300 font-mono">malloc()</code> é diferente de <code className="text-rose-400 font-mono">NULL</code> antes de usar a memória, e libere com <code className="text-amber-300 font-mono">free()</code>.</li>
                  <li><strong className="text-slate-300">Strings:</strong> Lembre-se que strings em C são vetores de caracteres terminados pelo caractere nulo <code className="text-amber-300 font-mono">'\0'</code>.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
