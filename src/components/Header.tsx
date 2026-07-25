import React from 'react';
import {
  Video,
  Plus,
  Play,
  Upload,
  Globe,
  Sparkles,
  ChevronDown,
  Layers,
  User,
  Layout,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { VslProject, UserSession } from '../types';

interface HeaderProps {
  projects: VslProject[];
  selectedProject: VslProject;
  onSelectProject: (project: VslProject) => void;
  onOpenNewVslModal: () => void;
  onOpenAuthModal: () => void;
  onOpenLandingPagePreview: () => void;
  currentUser: UserSession | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onOpenNewVslModal,
  onOpenAuthModal,
  onOpenLandingPagePreview,
  currentUser,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="w-full bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
      {/* SELETOR DE VSL ATIVO */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-indigo-400">
          <Layers className="w-5 h-5" />
        </div>

        <div className="flex-1 sm:flex-none">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">VSL Ativo para Análise</p>
          <div className="relative mt-0.5">
            <select
              value={selectedProject.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="w-full sm:w-80 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white font-bold text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer transition-all"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-neutral-900 text-white">
                  {proj.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* AÇÕES DIREITAS */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
        {/* Toggle Tema Claro / Escuro */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 font-semibold text-xs border border-neutral-800 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          title={theme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Ver Landing Page do VSL */}
        <button
          onClick={onOpenLandingPagePreview}
          className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-indigo-300 hover:text-white font-semibold text-xs border border-neutral-800 hover:border-indigo-500/50 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Ver como os clientes enxergam a página final desta VSL"
        >
          <Layout className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Ver Landing Page</span>
          <ExternalLink className="w-3 h-3 text-neutral-500" />
        </button>

        {/* Botão de Cadastrar / Fazer Upload / Inserir Link */}
        <button
          onClick={onOpenNewVslModal}
          className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-100 font-semibold text-xs border border-neutral-700 shadow-sm hover:border-indigo-500 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Novo VSL</span>
        </button>

        {/* Conta SaaS / Login / Profile */}
        <button
          onClick={onOpenAuthModal}
          className={`px-3.5 py-2 rounded-lg font-semibold text-xs border transition-all flex items-center gap-2 cursor-pointer ${
            currentUser
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white hover:border-neutral-700'
          }`}
        >
          <User className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[120px] truncate">
            {currentUser ? currentUser.name || currentUser.email : 'Entrar / SaaS'}
          </span>
        </button>
      </div>
    </header>
  );
};


