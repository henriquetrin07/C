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
  GraduationCap,
  Cpu,
  Award,
  HelpCircle,
  Lightbulb,
  RotateCcw,
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
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleApply = () => {
    if (!diagnosis?.fullFixedCode) return;
    onApplyFix(diagnosis.fullFixedCode, diagnosis.file || activeFile.name);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isLoading) return;
    onRequestReanalysis(customQuestion.trim());
    setCustomQuestion('');
  };

  const handleQuickQuestion = (question: string) => {
    onRequestReanalysis(question);
  };

  const handleQuizSelect = (index: number) => {
    setQuizAnswer(index);
    setQuizSubmitted(true);
  };

  const handleQuizReset = () => {
    setQuizAnswer(null);
    setQuizSubmitted(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-950/60 rounded-xl border border-slate-800">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          <Sparkles className="w-4 h-4 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-slate-200 font-semibold text-sm">Professor IA Analisando seu Código C...</h4>
          <p className="text-slate-400 text-xs">
            Examinando compilação, ponteiros, fluxo de execução e preparando lição didática explicativa.
          </p>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2.5 bg-slate-950/30 rounded-xl border border-slate-800/60">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-300">Tutor Pedagógico em Espera</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clique em <span className="text-emerald-400 font-mono font-medium">"Executar"</span> ou <span className="text-amber-400 font-mono font-medium">"Diagnóstico IA"</span> para receber lições detalhadas, modelos mentais de memória e quizzes interativos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-4 shadow-lg">
      {/* Header bar */}
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              diagnosis.hasError
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {diagnosis.hasError ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  diagnosis.hasError
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {diagnosis.hasError ? 'Ajuste Necessário' : 'Código 100% Válido'}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>
                  {diagnosis.source === 'gemini' ? 'Tutor IA (Gemini Flash)' : 'Tutor Semântico C'}
                </span>
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-0.5">
              {diagnosis.errorTitle}
            </h3>
          </div>
        </div>

        {diagnosis.hasError && diagnosis.line && (
          <button
            onClick={() => onJumpToLine(diagnosis.file, diagnosis.line)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/70 text-[11px] font-medium transition-colors shrink-0"
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

      {/* Main Diagnostic Sections */}
      {diagnosis.hasError ? (
        <div className="space-y-3.5">
          {/* Grid: 1. O que errou / 2. Por que acontece */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card 1: O Que Você Errou */}
            <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-rose-400 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>1. O que ocorreu no seu código:</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-3.5">
                {diagnosis.whatWentWrong}
              </p>
            </div>

            {/* Card 2: Por Que Isso Acontece em C */}
            <div className="bg-slate-900/90 border border-indigo-900/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>2. Como a Linguagem C funciona:</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-3.5">
                {diagnosis.whyItHappened}
              </p>
            </div>
          </div>

          {/* Card: Lição Didática & Analogia */}
          {diagnosis.educationalLesson && (
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>Lição do Professor: Entendendo com uma Analogia do Mundo Real</span>
              </div>
              <p className="text-amber-100/90 text-xs leading-relaxed pl-6">
                {diagnosis.educationalLesson}
              </p>
            </div>
          )}

          {/* Card: Modelo Mental de Memória RAM */}
          {diagnosis.mentalModel && (
            <div className="bg-slate-900/95 border border-cyan-900/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Modelo Mental: O que acontece na Memória RAM / Hardware</span>
              </div>
              <div className="bg-slate-950 border border-cyan-950 rounded-lg p-2.5 overflow-x-auto">
                <pre className="font-mono text-[11px] text-cyan-200/90 leading-relaxed whitespace-pre">
                  {diagnosis.mentalModel}
                </pre>
              </div>
            </div>
          )}

          {/* Card: Como Corrigir (Full Width) */}
          <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Como corrigir o código:</span>
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

          {/* Card: Dica de Ouro */}
          {diagnosis.goldenRule && (
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3 flex items-start space-x-2.5">
              <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-amber-300">Dica de Ouro do Mestre em C: </span>
                <span className="text-slate-200">{diagnosis.goldenRule}</span>
              </div>
            </div>
          )}

          {/* Card: Mini-Quiz Interativo */}
          {diagnosis.miniQuiz && (
            <div className="bg-slate-900/90 border border-purple-900/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>Mini-Quiz: Teste seu entendimento agora</span>
                </div>
                {quizSubmitted && (
                  <button
                    onClick={handleQuizReset}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Tentar Novamente</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-200 font-medium">{diagnosis.miniQuiz.question}</p>

              <div className="space-y-1.5">
                {diagnosis.miniQuiz.options.map((opt, idx) => {
                  const isSelected = quizAnswer === idx;
                  const isCorrect = idx === diagnosis.miniQuiz!.correctIndex;
                  let btnClass = 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300';

                  if (quizSubmitted) {
                    if (isCorrect) {
                      btnClass = 'border-emerald-600 bg-emerald-950/40 text-emerald-200 font-medium';
                    } else if (isSelected) {
                      btnClass = 'border-rose-600 bg-rose-950/40 text-rose-200';
                    } else {
                      btnClass = 'border-slate-800 bg-slate-950/30 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !quizSubmitted && handleQuizSelect(idx)}
                      disabled={quizSubmitted}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between ${btnClass}`}
                    >
                      <span>{opt}</span>
                      {quizSubmitted && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {quizSubmitted && isSelected && !isCorrect && (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div
                  className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    quizAnswer === diagnosis.miniQuiz.correctIndex
                      ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/50'
                      : 'bg-rose-950/30 text-rose-300 border border-rose-900/50'
                  }`}
                >
                  <span className="font-semibold">
                    {quizAnswer === diagnosis.miniQuiz.correctIndex
                      ? 'Parabéns, resposta correta! 🎉 '
                      : 'Não foi dessa vez! '}
                  </span>
                  {diagnosis.miniQuiz.explanation}
                </div>
              )}
            </div>
          )}
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
            <span>Perguntas Frequentes sobre este Conceito:</span>
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
            placeholder="Dúvida sobre o erro? Pergunte para o Professor IA (ex: 'como alocar com malloc?')..."
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
