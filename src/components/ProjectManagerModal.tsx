import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FolderGit2,
  Save,
  Trash2,
  FolderOpen,
  Clock,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  Layers,
  Download,
  Upload,
  Database,
} from 'lucide-react';
import { User, UserProject, SourceFile } from '../types';
import { DatabaseClient } from '../utils/database';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  authToken: string | null;
  currentFiles: SourceFile[];
  onOpenAuth: () => void;
  onLoadProject: (project: UserProject) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentFiles,
  onOpenAuth,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, currentUser]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser ? currentUser.id : 'guest';
      const loaded = await DatabaseClient.getProjects(userId);
      setProjects(loaded);
    } catch (err: any) {
      console.error('Failed to fetch projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!saveName.trim()) {
      setStatusMessage({ text: 'Por favor, digite um nome para o projeto.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await DatabaseClient.saveProject(currentUser.id, {
        title: saveName.trim(),
        description: saveDescription.trim(),
        files: currentFiles,
      });

      if (res.success) {
        setStatusMessage({ text: 'Projeto salvo no banco de dados com sucesso!', type: 'success' });
        setSaveName('');
        setSaveDescription('');
        await fetchProjects();
      } else {
        setStatusMessage({ text: res.error || 'Erro ao salvar projeto.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao salvar projeto', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const userId = currentUser ? currentUser.id : 'guest';
    if (!confirm(`Deseja realmente excluir o projeto "${name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      await DatabaseClient.deleteProject(userId, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setStatusMessage({ text: `Projeto "${name}" removido do banco de dados.`, type: 'success' });
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const handleLoad = (project: UserProject) => {
    onLoadProject(project);
    const projectName = project.title || project.name || 'Projeto';
    setStatusMessage({ text: `Projeto "${projectName}" carregado no editor!`, type: 'success' });
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleExportBackup = () => {
    const userId = currentUser ? currentUser.id : 'guest';
    const json = DatabaseClient.exportProjectsBackup(userId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projetos_c_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'Backup exportado com sucesso!', type: 'success' });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const userId = currentUser ? currentUser.id : 'guest';
        const count = DatabaseClient.importProjectsBackup(userId, content);
        if (count > 0) {
          setStatusMessage({ text: `${count} projeto(s) importados para o banco de dados!`, type: 'success' });
          await fetchProjects();
        } else {
          setStatusMessage({ text: 'Nenhum projeto válido encontrado no arquivo.', type: 'error' });
        }
      } catch {
        setStatusMessage({ text: 'Falha ao ler o arquivo JSON.', type: 'error' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>Banco de Dados de Projetos em C</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  Ativo & Conectado
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentUser
                  ? `Conta @${currentUser.username} • Seus códigos salvos com segurança`
                  : 'Salve seus códigos na sua conta ou exporte seus arquivos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center space-x-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60'
                : 'bg-rose-950/40 text-rose-300 border-rose-900/60'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!currentUser ? (
            /* Warning prompt to login */
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Crie sua Conta para Salvar seus Projetos</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                  Cadastre-se gratuitamente em segundos (somente usuário e senha) para armazenar todos os seus programas em C com segurança no banco de dados!
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold transition-all shadow-md inline-flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar ou Criar Conta Agora</span>
              </button>
            </div>
          ) : (
            /* Save form */
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Salvar Arquivos Atuais no Banco de Dados</span>
              </div>
              <form onSubmit={handleSaveCurrent} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nome do projeto (ex: Calculadora C)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <input
                    type="text"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Breve descrição (opcional)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    disabled={isSaving || !saveName.trim()}
                    className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-40"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Salvar no Banco ({currentFiles.length} arquivos)</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Project List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Projetos Salvos ({projects.length})</span>
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={projects.length === 0}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 disabled:opacity-40"
                  title="Baixar backup de todos os projetos em JSON"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                  title="Importar projetos de um backup JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Importar</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <button
                  onClick={fetchProjects}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors ml-1"
                >
                  Atualizar
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8 space-x-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Carregando projetos do banco de dados...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl space-y-2 bg-slate-950/20">
                <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-400">Nenhum projeto salvo no banco ainda</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Escreva seu código no editor e use o formulário acima para salvar com segurança.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-md space-y-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                          {proj.title || proj.name || 'Projeto sem título'}
                        </h5>
                        <button
                          onClick={() => handleDelete(proj.id, proj.title || proj.name || 'Projeto')}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                          title="Excluir projeto do banco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <FileCode className="w-3 h-3 text-slate-400" />
                          <span>{proj.files?.length || 1} arquivo(s)</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleLoad(proj)}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Abrir no Editor</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
