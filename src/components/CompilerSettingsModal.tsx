import React from 'react';
import { X, Sliders, Shield, Zap } from 'lucide-react';
import { CompilerOptions } from '../types';

interface CompilerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: CompilerOptions;
  onChangeOptions: (options: CompilerOptions) => void;
}

export const CompilerSettingsModal: React.FC<CompilerSettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Configurações do Compilador</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-sans text-slate-300">
          {/* Compiler Selection */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Motor de Compilação:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeOptions({ ...options, compiler: 'gcc' })}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  options.compiler === 'gcc'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>GCC 12 (Recomendado)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Padrão da indústria, otimizações completas e diagnósticos detalhados.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangeOptions({ ...options, compiler: 'tcc' })}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  options.compiler === 'tcc'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Tiny C Compiler (TCC)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Compilação ultrarrápida em milissegundos para testes iterativos.
                </p>
              </button>
            </div>
          </div>

          {/* Standard ISO C */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Padrão da Linguagem (C Standard):</label>
            <select
              value={options.standard}
              onChange={(e) => onChangeOptions({ ...options, standard: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500 font-mono text-xs"
            >
              <option value="c11">C11 (ISO/IEC 9899:2011) - Moderno & Padrão</option>
              <option value="c17">C17 / C18 (ISO/IEC 9899:2018)</option>
              <option value="c99">C99 (ISO/IEC 9899:1999)</option>
              <option value="c89">C89 / ANSI C (Clássico)</option>
            </select>
          </div>

          {/* Optimization Level */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Nível de Otimização (-O):</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['-O0', '-O1', '-O2', '-O3', '-Os'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChangeOptions({ ...options, optimization: opt })}
                  className={`py-1.5 px-2 rounded border text-center font-mono font-semibold transition-colors ${
                    options.optimization === opt
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              -O0 para depuração, -O2 para balanceamento de performance, -O3 para vetorização máxima.
            </p>
          </div>

          {/* Warning flags */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Avisos e Diagnósticos (Warnings):</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enableWall}
                  onChange={(e) => onChangeOptions({ ...options, enableWall: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span className="font-mono text-slate-300">-Wall (Todos os avisos comuns)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enableWextra}
                  onChange={(e) => onChangeOptions({ ...options, enableWextra: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span className="font-mono text-slate-300">-Wextra (Avisos extras de conformidade)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enablePedantic}
                  onChange={(e) => onChangeOptions({ ...options, enablePedantic: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span className="font-mono text-slate-300">-pedantic (Rigor estrito ao padrão ISO)</span>
              </label>
            </div>
          </div>

          {/* Custom flags */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Flags Adicionais de Compilação:</label>
            <input
              type="text"
              value={options.customFlags}
              onChange={(e) => onChangeOptions({ ...options, customFlags: e.target.value })}
              placeholder="ex: -DDEBUG -lm"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500 font-mono text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
