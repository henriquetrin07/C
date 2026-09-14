import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Wand2,
  Check,
  Send,
  Loader2,
  FileCode,
  BookOpen,
} from 'lucide-react';
import { AIDiagnosis, SourceFile } from '../types';

interface AIDiagnosisPanelProps {
  diagnosis: AIDiagnosis | null;
  isLoading: boolean;
  activeFile: SourceFile;
  onApplyFix: (fixedCode: string, fileName?: string) => void;
  onJumpToLine: (fileName?: string, line?: number) => void;
  onRequestReanalysis: (customQuestion?: string) => void;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({
  diagnosis,
  isLoading,
  activeFile,
  onApplyFix,
  onJumpToLine,
  onRequestReanalysis,
}) => {
  const [applied, setApplied] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  const handleApply = () => {
    if (!diagnosis?.fullFixedCode) return;
    onApplyFix(diagnosis.fullFixedCode, diagnosis.file || activeFile.name);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isLoading) return;
    onRequestReanalysis(customQuestion);
    setCustomQuestion('');
  };

  const handleQuickQuestion = (q: string) => {
    onRequestReanalysis(q);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 font-sans">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <Loader2 className="w-12 h-12 text-amber-500/40 animate-spin absolute inset-0" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Avaliando Código com IA...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Examinando a árvore sintática, variáveis, memória e mensagens do compilador para gerar o diagnóstico explicativo.
          </p>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 font-sans">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-amber-400/70" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-300">Assistente e Diagnóstico de Erros</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Execute seu código com o botão <strong className="text-emerald-400 font-medium">Executar (Ctrl+Enter)</strong>. Se houver qualquer erro de compilação ou execução, a IA explicará onde você errou, por que aconteceu e fornecerá a correção pronta.
          </p>
        </div>
        <button
          onClick={() => onRequestReanalysis()}
          className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Fazer Varredura de Diagnóstico Agora</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 font-sans text-xs select-text overflow-y-auto max-h-[600px]">
      {/* Header with status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              diagnosis.hasError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {diagnosis.hasError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>{diagnosis.errorTitle}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-normal ${
                  diagnosis.source === 'gemini'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {diagnosis.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Motor Diagnóstico C'}
              </span>
            </h3>
          </div>
        </div>

        {diagnosis.hasError && diagnosis.line && (
          <button
            onClick={() => onJumpToLine(diagnosis.file, diagnosis.line)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/70 text-[11px] font-medium transition-colors"
            title="Destacar linha no editor de código"
          >
            <FileCode className="w-3 h-3" />
            <span>
              {diagnosis.file || activeFile.name}:{diagnosis.line}
            </span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        )}
      </div>

      {/* Main 3 Diagnostic Sections: O que errou / Por que acontece / Como corrigir */}
      {diagnosis.hasError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card 1: O Que Você Errou */}
          <div className="bg-slate-900/80 border border-rose-900/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-1.5 text-rose-400 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>1. O que você errou:</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed pl-3.5">
              {diagnosis.whatWentWrong}
            </p>
          </div>

          {/* Card 2: Por Que Isso Acontece em C */}
          <div className="bg-slate-900/80 border border-indigo-900/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>2. Por que isso acontece na linguagem C:</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed pl-3.5">
              {diagnosis.whyItHappened}
            </p>
          </div>

          {/* Card 3: Como Corrigir (Full Width) */}
          <div className="md:col-span-2 bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>3. Como corrigir o código:</span>
              </div>

              {diagnosis.fullFixedCode && (
                <button
                  id="btn-apply-ai-fix"
                  onClick={handleApply}
                  disabled={applied}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                    applied
                      ? 'bg-emerald-700 text-emerald-100'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                  }`}
                >
                  {applied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Correção Aplicada!</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Aplicar Correção no Código</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">{diagnosis.howToFix}</p>

            {/* Code Diff preview if snippets are available */}
            {(diagnosis.originalSnippet || diagnosis.fixedSnippet) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                {diagnosis.originalSnippet && (
                  <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5">
                    <div className="text-[10px] text-rose-400 font-sans font-medium uppercase mb-1">
                      Antes (com erro):
                    </div>
                    <pre className="text-rose-200 whitespace-pre-wrap break-words">
                      {diagnosis.originalSnippet}
                    </pre>
                  </div>
                )}
                {diagnosis.fixedSnippet && (
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-2.5">
                    <div className="text-[10px] text-emerald-400 font-sans font-medium uppercase mb-1">
                      Depois (corrigido):
                    </div>
                    <pre className="text-emerald-200 whitespace-pre-wrap break-words">
                      {diagnosis.fixedSnippet}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Success clean card */
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 space-y-2">
          <p className="text-emerald-300 text-xs leading-relaxed">{diagnosis.whatWentWrong}</p>
          <p className="text-slate-300 text-xs leading-relaxed">{diagnosis.whyItHappened}</p>
          <div className="pt-2">
            <span className="text-slate-400 font-medium">Recomendação: </span>
            <span className="text-slate-300">{diagnosis.howToFix}</span>
          </div>
        </div>
      )}

      {/* Quick interactive questions */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium text-[11px] flex items-center space-x-1">
            <BookOpen className="w-3 h-3 text-amber-400" />
            <span>Perguntas Frequentes sobre este Erro:</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleQuickQuestion('Por que a linguagem C exige ponto e vírgula em cada instrução?')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-[11px] transition-colors"
          >
            Por que o C exige ';' ?
          </button>
          <button
            onClick={() => handleQuickQuestion('Como funciona o operador & com ponteiros no scanf?')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-[11px] transition-colors"
          >
            Como funciona o '&' no scanf?
          </button>
          <button
            onClick={() => handleQuickQuestion('O que causa Segmentation Fault e como depurar?')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-[11px] transition-colors"
          >
            O que é Segmentation Fault?
          </button>
          <button
            onClick={() => handleQuickQuestion('Qual a diferença entre passar variável por valor ou por referência em C?')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-[11px] transition-colors"
          >
            Valor vs Referência em C
          </button>
        </div>

        {/* Custom question input form */}
        <form onSubmit={handleAsk} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Dúvida sobre o erro? Pergunte para a IA (ex: 'como alocar com malloc?')..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
          <button
            type="submit"
            disabled={!customQuestion.trim() || isLoading}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
          >
            <span>Perguntar</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
