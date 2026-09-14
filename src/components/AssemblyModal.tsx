import React, { useState } from 'react';
import { X, Cpu, Copy, Check, Download, RefreshCw } from 'lucide-react';

interface AssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  assemblyCode: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AssemblyModal: React.FC<AssemblyModalProps> = ({
  isOpen,
  onClose,
  assemblyCode,
  isLoading,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (assemblyCode) {
      navigator.clipboard.writeText(assemblyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!assemblyCode) return;
    const blob = new Blob([assemblyCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigo.s';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Código Assembly Gerado (x86_64)</h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Compilado diretamente via GNU Assembler (GAS) com otimização -O2 e comentários verbosos.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Recarregar Assembly"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleCopy}
              disabled={!assemblyCode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Copiar código"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              disabled={!assemblyCode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Baixar arquivo .s"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 bg-[#0d1117] overflow-auto font-mono text-[12px] leading-relaxed text-purple-200/90 select-text">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-purple-400 space-x-2">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span>Gerando código Assembly com GCC...</span>
            </div>
          ) : assemblyCode ? (
            <pre className="whitespace-pre">{assemblyCode}</pre>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 font-sans">
              Nenhum código Assembly gerado. Clique no botão de atualizar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
