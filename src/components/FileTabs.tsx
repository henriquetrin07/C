import React, { useState } from 'react';
import { FileCode, Plus, X, Edit2, Check } from 'lucide-react';
import { SourceFile, CompilerDiagnostic } from '../types';

interface FileTabsProps {
  files: SourceFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (name: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  diagnostics: CompilerDiagnostic[];
}

export const FileTabs: React.FC<FileTabsProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  diagnostics,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleStartRename = (file: SourceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditingName(file.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      let name = editingName.trim();
      if (!name.endsWith('.c') && !name.endsWith('.h')) {
        name += '.c';
      }
      onRenameFile(id, name);
    }
    setEditingId(null);
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      let name = newFileName.trim();
      if (!name.endsWith('.c') && !name.endsWith('.h')) {
        name += '.c';
      }
      onAddFile(name);
      setNewFileName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 overflow-x-auto text-xs select-none">
      <div className="flex items-center space-x-1 py-1">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const fileDiagnostics = diagnostics.filter((d) => d.file === file.name);
          const hasError = fileDiagnostics.some((d) => d.type === 'error');
          const hasWarning = fileDiagnostics.some((d) => d.type === 'warning');

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-t-md cursor-pointer transition-all border-b-2 font-mono text-[12px] ${
                isActive
                  ? 'bg-slate-800 text-blue-400 border-blue-500 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
              }`}
            >
              <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />

              {editingId === file.id ? (
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(file.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="bg-slate-950 text-white px-1 py-0.5 rounded border border-blue-500 text-xs w-24 outline-none font-mono"
                  />
                  <button
                    onClick={() => handleSaveRename(file.id)}
                    className="text-emerald-400 hover:text-emerald-300 p-0.5"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="truncate max-w-[120px]">{file.name}</span>
              )}

              {/* Status Dot for Errors / Warnings */}
              {hasError ? (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Arquivo contém erros de compilação" />
              ) : hasWarning ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Arquivo contém avisos do compilador" />
              ) : null}

              {/* File action buttons on hover */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-0.5 ml-1">
                {editingId !== file.id && (
                  <button
                    onClick={(e) => handleStartRename(file, e)}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Renomear arquivo"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                )}
                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Fechar arquivo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add File Input or Button */}
        {isAdding ? (
          <div className="flex items-center space-x-1 px-2 py-1 bg-slate-800 rounded">
            <input
              type="text"
              placeholder="ex: funcoes.h"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              autoFocus
              className="bg-slate-950 text-white px-2 py-0.5 rounded border border-slate-700 text-xs w-28 outline-none font-mono"
            />
            <button onClick={handleCreateFile} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-200 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            id="btn-tab-add-file"
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded transition-colors text-xs ml-1"
            title="Adicionar arquivo ao projeto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        )}
      </div>

      <div className="text-[11px] text-slate-500 font-mono hidden md:block">
        ANSI C / ISO C
      </div>
    </div>
  );
};
