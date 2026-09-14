import React, { useState } from 'react';
import { X, BookOpen, Code2, ArrowRight } from 'lucide-react';
import { EXAMPLES } from '../data/examples';
import { ExampleTemplate } from '../types';

interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (example: ExampleTemplate) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({
  isOpen,
  onClose,
  onSelectExample,
}) => {
  const [selectedId, setSelectedId] = useState<string>(EXAMPLES[0].id);

  if (!isOpen) return null;

  const currentExample = EXAMPLES.find((ex) => ex.id === selectedId) || EXAMPLES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Biblioteca de Exemplos em C</h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Escolha um exemplo prático para testar e executar no compilador.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: List of Examples */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/50">
            {EXAMPLES.map((ex) => {
              const isSelected = ex.id === selectedId;
              return (
                <div
                  key={ex.id}
                  onClick={() => setSelectedId(ex.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 text-slate-100 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200">{ex.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {ex.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Code Preview & Load Action */}
          <div className="w-2/3 flex flex-col bg-[#0d1117] overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs text-slate-200">{currentExample.files[0]?.name || 'main.c'}</span>
                {currentExample.files.length > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    +{currentExample.files.length - 1} arquivos
                  </span>
                )}
              </div>

              <button
                id="btn-load-example-confirm"
                onClick={() => {
                  onSelectExample(currentExample);
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <span>Carregar no IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 bg-slate-900/40 border-b border-slate-800/60 text-xs text-slate-300 font-sans">
              <p className="font-semibold text-slate-200">{currentExample.title}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{currentExample.description}</p>
              {currentExample.stdin && (
                <div className="mt-1.5 flex items-center space-x-2 text-[11px]">
                  <span className="text-blue-400 font-mono">Entrada stdin inclusa:</span>
                  <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800">
                    {currentExample.stdin}
                  </code>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-[12px] leading-relaxed text-slate-200">
              <pre className="whitespace-pre">
                {currentExample.files.map((f) => `// --- ${f.name} ---\n${f.content}`).join('\n\n')}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
