import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  LogOut,
  X,
  CheckCircle2,
} from 'lucide-react';
import { UserSession } from '../types';
import { getSupabaseClient, saveLocalUserSession } from '../lib/supabase';

interface AuthModalProps {
  currentUser: UserSession | null;
  onLoginSuccess: (session: UserSession) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabaseClient();

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const userSession: UserSession = {
          id: data.user?.id || `user_${Date.now()}`,
          email: data.user?.email || email,
          name: data.user?.user_metadata?.name || email.split('@')[0],
        };

        saveLocalUserSession(userSession);
        onLoginSuccess(userSession);
        setSuccessMsg('Login efetuado com sucesso!');
        setTimeout(() => onClose(), 1000);
      } else {
        // Fallback para modo local / SaaS demo caso o Supabase não esteja conectado ainda
        const mockUserSession: UserSession = {
          id: `saas_user_${btoa(email).substring(0, 8)}`,
          email,
          name: email.split('@')[0] || 'Parceiro SaaS',
        };

        saveLocalUserSession(mockUserSession);
        onLoginSuccess(mockUserSession);
        setSuccessMsg('Login realizado com sucesso!');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Botão Fechar (apenas se não for login obrigatório ou se já estiver logado) */}
        {(!isMandatory || currentUser) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* HEADER DO MODAL */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {currentUser
              ? 'Minha Conta de Parceiro SaaS'
              : 'Acessar Painel VSL Optima'}
          </h3>
          <p className="text-xs text-neutral-400">
            {currentUser
              ? 'Você está autenticado e seus projetos estão isolados em seu ambiente exclusivo.'
              : 'Entre com seu e-mail e senha para acessar o painel de controle.'}
          </p>
        </div>

        {/* CONTEÚDO PARA USUÁRIO JÁ LOGADO */}
        {currentUser ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400">STATUS DA CONTA</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  ATIVO
                </span>
              </div>
              <p className="text-sm font-bold text-white">{currentUser.name || 'Parceiro'}</p>
              <p className="text-xs text-neutral-400 font-mono">{currentUser.email}</p>
              <p className="text-[10px] text-neutral-500 pt-1">
                ID Exclusivo: <code className="text-indigo-400">{currentUser.id}</code>
              </p>
            </div>

            <button
              onClick={() => {
                onLogout();
                saveLocalUserSession(null);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta (Logout)</span>
            </button>
          </div>
        ) : (
          /* FORMULÁRIO DE LOGIN E REGISTRO */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="seuemail@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
