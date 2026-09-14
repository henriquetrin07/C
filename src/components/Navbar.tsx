import React from 'react';
import {
  Play,
  RotateCcw,
  Settings,
  BookOpen,
  Cpu,
  Download,
  FilePlus,
  CheckCircle2,
  Globe,
  Sparkles,
  Bug,
  Square,
  Wand2,
  AlertTriangle,
  Keyboard,
} from 'lucide-react';
import { CompilerOptions } from '../types';

interface NavbarProps {
  isRunning: boolean;
  onRun: () => void;
  onStop?: () => void;
  onDebug: () => void;
  onBeautify: () => void;
  onReset: () => void;
  onNewFile: () => void;
  onOpenExamples: () => void;
  onOpenSettings: () => void;
  onOpenAssembly: () => void;
  onOpenAiAssist: () => void;
  onDownloadProject: () => void;
  onToggleStdin: () => void;
  compilerOptions: CompilerOptions;
  onChangeStandard: (std: 'c89' | 'c99' | 'c11' | 'c17') => void;
  engineMode: 'native' | 'cloud';
  hasErrors?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  isRunning,
  onRun,
  onStop,
  onDebug,
  onBeautify,
  onReset,
  onNewFile,
  onOpenExamples,
  onOpenSettings,
  onOpenAssembly,
  onOpenAiAssist,
  onDownloadProject,
  onToggleStdin,
  compilerOptions,
  onChangeStandard,
  engineMode,
  hasErrors = false,
}) => {
  return (
    <header className="bg-[#121824] border-b border-slate-800/90 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Left side: Brand + Engine status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-lg text-white shadow-md shadow-blue-500/20 border border-blue-400/30">
            C
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-100 text-sm tracking-tight font-sans">
                C GDB Compiler
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 border border-slate-700">
                Online IDE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden xl:block">
              Compilador C com IA para Diagnóstico & Correção
            </p>
          </div>
        </div>

        {/* Server / Cloud Status Pill */}
        <div className="hidden lg:flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300">
          {engineMode === 'native' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">GCC Nativo</span>
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 text-sky-400" />
              <span className="text-sky-300 font-medium">GCC Cloud (64-bit)</span>
            </>
          )}
        </div>
      </div>

      {/* Center: OnlineGDB Style Command Bar (Run, Debug, Stop, Beautify, AI Diagnosis) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Run Button (Green) */}
        <button
          id="btn-run-code"
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all ${
            isRunning
              ? 'bg-amber-600/80 text-white cursor-wait'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-900/30'
          }`}
          title="Compilar e Executar código C (Atalho: Ctrl+Enter ou F9)"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Executando...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-emerald-100" />
              <span>Run</span>
              <span className="text-[10px] bg-emerald-700/70 px-1 py-0.2 rounded text-emerald-100 hidden sm:inline font-mono">
                F9
              </span>
            </>
          )}
        </button>

        {/* Debug Button (OnlineGDB style) */}
        <button
          id="btn-debug-code"
          onClick={onDebug}
          disabled={isRunning}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-300 bg-slate-800 hover:bg-slate-700 hover:text-amber-200 border border-slate-700 transition-colors"
          title="Depurar e verificar erros com diagnóstico GCC"
        >
          <Bug className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Debug</span>
        </button>

        {/* Stop Button */}
        {isRunning && onStop && (
          <button
            id="btn-stop-code"
            onClick={onStop}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 transition-colors"
            title="Interromper execução"
          >
            <Square className="w-3 h-3 fill-current text-rose-400" />
            <span>Stop</span>
          </button>
        )}

        {/* Beautify (OnlineGDB style C formatter) */}
        <button
          id="btn-beautify-code"
          onClick={onBeautify}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
          title="Formatar indentação e chaves do código C (Beautify)"
        >
          <Wand2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">{'{ }'} Beautify</span>
        </button>

        {/* AI Diagnosis Button (Highlighted when errors occur) */}
        <button
          id="btn-ai-diagnosis"
          onClick={onOpenAiAssist}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
            hasErrors
              ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border-rose-700 shadow-md shadow-rose-900/30 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
          }`}
          title="Ver Diagnóstico e Correção da IA"
        >
          {hasErrors ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Diagnóstico IA</span>
          {hasErrors && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          )}
        </button>
      </div>

      {/* Right side: Language Selector (OnlineGDB style) & Project actions */}
      <div className="flex items-center space-x-1.5">
        {/* Language selector dropdown */}
        <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700/80 rounded-md px-2 py-1 text-xs text-slate-300">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Padrão:</span>
          <select
            value={compilerOptions.standard}
            onChange={(e) => onChangeStandard(e.target.value as any)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-mono"
            title="Selecionar padrão C do compilador"
          >
            <option value="c11" className="bg-slate-900 text-slate-200">C (gcc C11)</option>
            <option value="c99" className="bg-slate-900 text-slate-200">C (gcc C99)</option>
            <option value="c17" className="bg-slate-900 text-slate-200">C (gcc C17)</option>
            <option value="c89" className="bg-slate-900 text-slate-200">C (ANSI C89)</option>
          </select>
        </div>

        {/* Stdin button */}
        <button
          onClick={onToggleStdin}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Alternar painel de Entrada (stdin)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Examples */}
        <button
          id="btn-open-examples"
          onClick={onOpenExamples}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Exemplos prontos em C"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Assembly view */}
        <button
          id="btn-open-assembly"
          onClick={onOpenAssembly}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Inspecionar código Assembly x86_64 gerado"
        >
          <Cpu className="w-4 h-4" />
        </button>

        {/* New file */}
        <button
          id="btn-new-file"
          onClick={onNewFile}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Adicionar novo arquivo (.c ou .h)"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        {/* Download */}
        <button
          id="btn-download-source"
          onClick={onDownloadProject}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Baixar arquivos de código"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Reset */}
        <button
          id="btn-reset-code"
          onClick={onReset}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Restaurar código padrão"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          id="btn-compiler-settings"
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Configurações do Compilador (Flags, Otimizações)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

