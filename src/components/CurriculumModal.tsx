import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Code2,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Play,
  HelpCircle,
  Award,
  FileText,
  Table,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CURRICULUM_MODULES, C_CHEAT_SHEET } from '../data/curriculum';
import { CurriculumLesson } from '../types';

interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLessonCode: (code: string, fileName: string, suggestedStdin?: string) => void;
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  isOpen,
  onClose,
  onLoadLessonCode,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'cheatsheet'>('modules');
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('c_curriculum_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  if (!isOpen) return null;

  const currentModule = CURRICULUM_MODULES[currentModuleIndex];

  const handleToggleComplete = (id: string) => {
    setCompletedModules((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('c_curriculum_completed', JSON.stringify(next));
      return next;
    });
  };

  const completedCount = Object.values(completedModules).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / CURRICULUM_MODULES.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Escola de Programação C: Do Zero ao Avançado
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
                  10 Módulos Didáticos
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aprenda a pensar como um compilador e domine memória, ponteiros e algoritmos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Progress Badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Progresso: {progressPercent}% ({completedCount}/10)</span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-2.5 px-4 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'modules'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Trilha de Aprendizado (Módulos 1 ao 10)</span>
          </button>
          <button
            onClick={() => setActiveTab('cheatsheet')}
            className={`py-2.5 px-4 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'cheatsheet'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabelas de Consulta Rápida (Cheat Sheet)</span>
          </button>
        </div>

        {/* Modal Main Body */}
        {activeTab === 'modules' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Modules List */}
            <div className="w-72 sm:w-80 border-r border-slate-800 overflow-y-auto bg-slate-950/30 p-3 space-y-1.5 shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                Índice das Aulas
              </div>
              {CURRICULUM_MODULES.map((mod, idx) => {
                const isSelected = idx === currentModuleIndex;
                const isDone = !!completedModules[mod.id];

                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setCurrentModuleIndex(idx);
                      setShowSolution(false);
                      setShowHint(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950'
                          : isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : mod.moduleNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{mod.title}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{mod.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Panel: Module Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Module Header */}
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-800/80">
                    Módulo {currentModule.moduleNumber} de 10 • ~{currentModule.durationMinutes} minutos
                  </span>

                  <button
                    onClick={() => handleToggleComplete(currentModule.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      completedModules[currentModule.id]
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {completedModules[currentModule.id] ? 'Módulo Concluído!' : 'Marcar como Concluído'}
                    </span>
                  </button>
                </div>

                <h2 className="text-lg font-bold text-slate-100">{currentModule.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{currentModule.summary}</p>
              </div>

              {/* Teoria & Conceitos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Teoria & Como o Computador Funciona</span>
                </h4>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  {currentModule.theory.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Analogias do Mundo Real */}
              {currentModule.analogies && currentModule.analogies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Analogia do Mundo Real (Fixando o Conceito)</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentModule.analogies.map((analogy, i) => (
                      <div
                        key={i}
                        className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-100/90 leading-relaxed flex items-start space-x-2.5"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{analogy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exemplo de Código Interativo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span>Exemplo Prático Comentado</span>
                  </h4>
                  <button
                    onClick={() => {
                      onLoadLessonCode(
                        currentModule.codeExample.code,
                        currentModule.codeExample.fileName,
                        currentModule.codeExample.suggestedStdin
                      );
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Carregar e Executar no Editor</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs overflow-x-auto">
                  <pre className="text-emerald-300 leading-relaxed">
                    {currentModule.codeExample.code}
                  </pre>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  💡 {currentModule.codeExample.explanation}
                </p>
              </div>

              {/* Desafio Prático com Dica e Solução */}
              <div className="bg-slate-950/70 border border-indigo-900/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span>{currentModule.challenge.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      onLoadLessonCode(
                        currentModule.challenge.starterCode,
                        `desafio_modulo${currentModule.moduleNumber}.c`,
                        currentModule.challenge.suggestedStdin
                      );
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Resolver no Editor</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentModule.challenge.description}
                </p>

                {/* Hint and Solution toggles */}
                <div className="flex items-center space-x-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Ocultar Dica' : 'Precisa de Ajuda? Ver Dica'}</span>
                  </button>

                  <button
                    onClick={() => setShowSolution(!showSolution)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showSolution ? 'Ocultar Solução' : 'Ver Código da Solução'}</span>
                  </button>
                </div>

                {showHint && (
                  <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 text-xs text-amber-200 leading-relaxed">
                    <strong>Dica:</strong> {currentModule.challenge.hint}
                  </div>
                )}

                {showSolution && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">Solução Esperada:</div>
                    <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre">
                      {currentModule.challenge.solutionCode}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Module Navigation */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (currentModuleIndex > 0) {
                      setCurrentModuleIndex(currentModuleIndex - 1);
                      setShowSolution(false);
                      setShowHint(false);
                    }
                  }}
                  disabled={currentModuleIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Módulo Anterior</span>
                </button>

                <button
                  onClick={() => {
                    if (currentModuleIndex < CURRICULUM_MODULES.length - 1) {
                      setCurrentModuleIndex(currentModuleIndex + 1);
                      setShowSolution(false);
                      setShowHint(false);
                    }
                  }}
                  disabled={currentModuleIndex === CURRICULUM_MODULES.length - 1}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors"
                >
                  <span>Próximo Módulo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Cheatsheets View */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Especificadores de Formato */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Table className="w-4 h-4 text-amber-400" />
                <span>Tabela dos Especificadores de Formato (printf / scanf)</span>
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Símbolo</th>
                      <th className="px-4 py-2.5">Tipo de Dado</th>
                      <th className="px-4 py-2.5">Descrição e Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {C_CHEAT_SHEET.specifiers.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono font-bold text-amber-400">{s.spec}</td>
                        <td className="px-4 py-2 font-mono text-cyan-300">{s.type}</td>
                        <td className="px-4 py-2 text-slate-300">{s.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tipos Primitivos e Memória RAM */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <span>Tipos Primitivos de Dados e Tamanho em Bytes na RAM</span>
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Tipo</th>
                      <th className="px-4 py-2.5">Tamanho (Bytes)</th>
                      <th className="px-4 py-2.5">Faixa de Valores Suportada</th>
                      <th className="px-4 py-2.5">Finalidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {C_CHEAT_SHEET.dataTypes.map((dt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono font-bold text-indigo-300">{dt.type}</td>
                        <td className="px-4 py-2 font-mono text-amber-300">{dt.bytes} byte(s)</td>
                        <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">{dt.range}</td>
                        <td className="px-4 py-2 text-slate-300">{dt.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bibliotecas Padrão do C */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <span>Bibliotecas Padrão Principais (#include &lt;...h&gt;)</span>
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Cabeçalho (.h)</th>
                      <th className="px-4 py-2.5">Propósito</th>
                      <th className="px-4 py-2.5">Funções Frequentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {C_CHEAT_SHEET.standardLibraries.map((lib, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono font-bold text-emerald-400">{lib.header}</td>
                        <td className="px-4 py-2 text-slate-200">{lib.purpose}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-cyan-200">
                          {lib.commonFunctions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
