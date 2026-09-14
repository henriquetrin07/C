import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onLoginSuccess: (user: UserType, token: string) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha o nome de usuário e a senha.');
      return;
    }

    if (username.trim().length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha na autenticação');
      }

      setSuccess(
        isRegister
          ? 'Conta criada com sucesso! Você já está conectado.'
          : 'Login efetuado com sucesso!'
      );

      // Save token to localStorage for persistent session
      localStorage.setItem('c_ide_auth_token', data.token);

      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {currentUser ? 'Sua Conta de Programador' : isRegister ? 'Criar Conta Gratuita' : 'Entrar na sua Conta'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Salve seus códigos, projetos em C e histórico de aprendizado
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

        {/* Content */}
        <div className="p-6">
          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">{currentUser.username}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conta conectada com sucesso • Seus projetos estão sincronizados
                </p>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-left space-y-1 text-xs text-slate-300">
                <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sessão ativa e segura</span>
                </div>
                <p className="text-slate-400 text-[11px] pl-5.5">
                  Seus arquivos e programas em C ficam salvos na nuvem desta IDE e podem ser abertos a qualquer momento.
                </p>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Continuar Programando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('c_ide_auth_token');
                    onLogout();
                    onClose();
                  }}
                  className="py-2 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 text-xs font-semibold transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            /* Login/Register Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    !isRegister
                      ? 'bg-amber-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Entrar (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    isRegister
                      ? 'bg-amber-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{success}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nome de Usuário</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: dev_c, maria_silva"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Senha</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : isRegister ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Cadastrar e Começar a Salvar</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar e Carregar Projetos</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-500">
                Sistema simples e seguro: seus dados são salvos apenas na sua conta para você nunca perder seus códigos em C.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
