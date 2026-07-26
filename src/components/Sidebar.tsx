import React from 'react';
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Sliders,
  Activity,
  PlusCircle,
  PlayCircle,
  Zap,
  Database,
  Layout,
  Cloud,
  Settings
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  vslCount: number;
  onOpenNewVslModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  vslCount,
  onOpenNewVslModal,
}) => {
  const mainNavItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Painel Principal',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'vsls' as ActiveTab,
      label: 'Meus Vídeos (VSLs)',
      icon: Video,
      badge: vslCount.toString(),
    },
    {
      id: 'landing_customizer' as ActiveTab,
      label: 'Landing Page & Pitch Builder',
      icon: Layout,
      badge: 'BUILDER',
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Gráfico de Retenção',
      icon: BarChart3,
      badge: 'PRO',
    },
    {
      id: 'events' as ActiveTab,
      label: 'Logs de Eventos (Live)',
      icon: Activity,
      badge: undefined,
    },
  ];

  const configNavItems = [
    {
      id: 'cloudflare_r2' as ActiveTab,
      label: 'Cloudflare R2 Storage',
      icon: Cloud,
      badge: 'R2',
    },
    {
      id: 'supabase' as ActiveTab,
      label: 'Supabase & SQL',
      icon: Database,
      badge: 'DB',
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-neutral-950 border-r border-neutral-800 p-5 flex flex-col justify-between shrink-0 z-30">
      <div>
        {/* BRAND LOGO */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30">
              <PlayCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none flex items-center gap-1">
                VSL<span className="text-indigo-400">Haus</span>
              </h1>
              <p className="text-[10px] text-neutral-400 font-medium font-mono uppercase tracking-wider">High Conversion Engine</p>
            </div>
          </div>
        </div>

        {/* BOTAO DE INSERIR NOVO VÍDEO / LINK */}
        <button
          onClick={onOpenNewVslModal}
          className="w-full mb-6 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Cadastrar Novo VSL</span>
        </button>

        {/* NAVEGAÇÃO DE MENU PRINCIPAL */}
        <div className="space-y-4">
          <div>
            <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Menu Principal
            </p>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-indigo-400 border border-neutral-800 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SEÇÃO ISOLADA: CONFIGURAÇÕES E INTEGRAÇÕES */}
          <div className="pt-3 border-t border-neutral-800/80">
            <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Settings className="w-3 h-3 text-neutral-500" />
              <span>Configurações (Isolado)</span>
            </p>
            <nav className="space-y-1">
              {configNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg font-medium text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-indigo-400 border border-neutral-800 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* FOOTER DA SIDEBAR */}
      <div className="pt-4 border-t border-neutral-800">
        <div className="rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 p-3.5 border border-neutral-800 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> VSL Haus Pro
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              v1.3
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-tight">
            Gatilhos de retenção e acelerador de pitch ativos.
          </p>
        </div>
      </div>
    </aside>
  );
};
