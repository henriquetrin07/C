import React from 'react';
import { Play, RotateCcw, Settings, BookOpen, Cpu, Download, FilePlus, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { CompilerOptions } from '../types';

interface NavbarProps {
  isRunning: boolean;
  onRun: () => void;
  onReset: () => void;
  onNewFile: () => void;
  onOpenExamples: () => void;
  onOpenSettings: () => void;
  onOpenAssembly: () => void;
  onOpenAiAssist: () => void;
  onDownloadProject: () => void;
  compilerOptions: CompilerOptions;
  serverReady: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  isRunning,
  onRun,
  onReset,
  onNewFile,
  onOpenExamples,
  onOpenSettings,
  onOpenAssembly,
  onOpenAiAssist,
  onDownloadProject,
  compilerOptions,
  serverReady,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between select-none">
      {/* Left side: Brand and Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-blue-500/20">
            C
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 text-sm tracking-tight">C Web IDE</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                {compilerOptions.compiler.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Compilador & Ambiente C no Navegador</p>
          </div>
        </div>

        {/* Server Status Pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] bg-slate-800/80 border border-slate-700/60 text-slate-300">
          {serverReady ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">GCC / TCC Conectado</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-amber-300">Conectando...</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Run Primary Button */}
      <div className="flex items-center space-x-2">
        <button
          id="btn-run-code"
          onClick={onRun}
          disabled={isRunning || !serverReady}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
            isRunning
              ? 'bg-amber-600/80 text-white cursor-wait'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-700/30'
          }`}
          title="Executar código C (Atalho: Ctrl+Enter ou F9)"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Compilando...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar</span>
              <span className="text-[10px] bg-emerald-700/60 px-1 py-0.2 rounded text-emerald-100 hidden sm:inline">
                Ctrl+↵
              </span>
            </>
          )}
        </button>

        <button
          id="btn-open-examples"
          onClick={onOpenExamples}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
          title="Exemplos prontos de C"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Exemplos</span>
        </button>

        <button
          id="btn-open-assembly"
          onClick={onOpenAssembly}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
          title="Inspecionar código Assembly x86_64 gerado"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Assembly</span>
        </button>

        <button
          id="btn-open-ai-tutor"
          onClick={onOpenAiAssist}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
          title="Explicar código e depurar com IA"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Tutor C</span>
        </button>
      </div>

      {/* Right side: Actions & Settings */}
      <div className="flex items-center space-x-1.5">
        <button
          id="btn-new-file"
          onClick={onNewFile}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Adicionar novo arquivo (.c ou .h)"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        <button
          id="btn-download-source"
          onClick={onDownloadProject}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Baixar arquivos de código"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          id="btn-reset-code"
          onClick={onReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Restaurar código padrão"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          id="btn-compiler-settings"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Configurações do Compilador (Flags, Padrão C, Otimizações)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
