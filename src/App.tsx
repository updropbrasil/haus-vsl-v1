import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VslPlayer } from './components/VslPlayer';
import { RetentionChart } from './components/RetentionChart';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { VslUploaderModal } from './components/VslUploaderModal';
import { EventLogTable } from './components/EventLogTable';
import { PitchConfigurator } from './components/PitchConfigurator';
import { SupabaseConfig } from './components/SupabaseConfig';
import { CloudflareR2Config } from './components/CloudflareR2Config';
import { LandingPageCustomizer } from './components/LandingPageCustomizer';
import { VslPublicLandingPage } from './components/VslPublicLandingPage';
import { AuthModal } from './components/AuthModal';
import { SystemDebugger } from './components/SystemDebugger';
import {
  syncProjectToSupabase,
  sendEventToSupabase,
  fetchProjectsFromSupabase,
  deleteProjectFromSupabase,
  getLocalUserSession,
  saveLocalUserSession,
} from './lib/supabase';
import { INITIAL_VSL_PROJECTS } from './mockData';
import {
  VslProject,
  ActiveTab,
  VslEvent,
  PitchConfig,
  LandingPageConfig,
  UserSession,
} from './types';
import {
  Video,
  Play,
  BarChart3,
  Sliders,
  Plus,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Trash2,
  Layout,
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<VslProject[]>(() => {
    try {
      const stored = localStorage.getItem('vsl_projects_db');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_VSL_PROJECTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'vsl-001');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getLocalUserSession());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('vsl_app_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return 'dark';
  });

  // Atualiza atributo no HTML para reatividade CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('vsl_app_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vsl_projects_db', JSON.stringify(projects));
    } catch {
      // Fallback
    }
  }, [projects]);

  // Busca VSLs reais do Supabase na inicialização, se disponível
  useEffect(() => {
    async function loadFromSupabase() {
      const realProjects = await fetchProjectsFromSupabase();
      if (realProjects && realProjects.length > 0) {
        setProjects(realProjects);
        setSelectedProjectId(realProjects[0].id);
      }
    }
    loadFromSupabase();
  }, []);

  // Handler: Limpar Dados de Exemplo (Mockup)
  const handleClearMockData = () => {
    if (confirm('Deseja remover todos os VSLs de exemplo/mockup e manter apenas os seus vídeos reais?')) {
      const userProjects = projects.filter(
        (p) => !['vsl-001', 'vsl-002', 'vsl-003'].includes(p.id)
      );
      if (userProjects.length > 0) {
        setProjects(userProjects);
        setSelectedProjectId(userProjects[0].id);
      } else {
        const cleanProject: VslProject = {
          id: `vsl-real-${Date.now()}`,
          title: 'Meu Primeiro VSL Cloudflare R2',
          description: 'Projeto limpo para adicionar o seu vídeo do Cloudflare R2',
          videoUrl: '',
          durationSeconds: 180,
          createdAt: new Date().toISOString(),
          totalViews: 0,
          plays: 0,
          completionCount: 0,
          avgWatchTimeSeconds: 0,
          aspectRatio: '16:9',
          pitchConfig: {
            pitchTimeSeconds: 60,
            ctaText: 'COMPRAR COM DESCONTO EXCLUSIVO',
            ctaUrl: 'https://seuempreendimento.com.br/checkout',
            ctaButtonColor: '#059669',
            pulseEffect: true,
            showCountdown: true,
          },
          retentionData: [],
          events: [],
        };
        setProjects([cleanProject]);
        setSelectedProjectId(cleanProject.id);
        syncProjectToSupabase(cleanProject);
      }
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Handler: Add new project
  const handleAddProject = (newProj: VslProject) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
    setActiveTab('dashboard');
    syncProjectToSupabase(newProj);
  };

  // Handler: Update Aspect Ratio (16:9, 9:16, 1:1, 4:5)
  const handleUpdateAspectRatio = (aspectRatio: '16:9' | '9:16' | '1:1' | '4:5') => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = { ...proj, aspectRatio };
          syncProjectToSupabase(updated);
          return updated;
        }
        return proj;
      })
    );
  };

  // Handler: Track Video Events
  const handleTrackEvent = (eventData: Omit<VslEvent, 'id' | 'createdAt'>) => {
    const newEvt: VslEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };

    sendEventToSupabase(newEvt);

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === eventData.vslId) {
          const updatedEvents = [newEvt, ...(proj.events || [])];
          let updatedPlays = proj.plays;
          let updatedCompletions = proj.completionCount;

          if (eventData.eventType === 'play') updatedPlays += 1;
          if (eventData.eventType === 'milestone_100') updatedCompletions += 1;

          const updatedProj = {
            ...proj,
            plays: updatedPlays,
            completionCount: updatedCompletions,
            events: updatedEvents,
          };

          syncProjectToSupabase(updatedProj);
          return updatedProj;
        }
        return proj;
      })
    );
  };

  // Handler: Save Pitch Config
  const handleSavePitchConfig = (newConfig: PitchConfig) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = {
            ...proj,
            pitchConfig: newConfig,
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return proj;
      })
    );
  };

  // Handler: Save Landing Page Config
  const handleSaveLandingPageConfig = (lpConfig: LandingPageConfig) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = {
            ...proj,
            landingPageConfig: lpConfig,
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return proj;
      })
    );
  };

  // Handler: Delete VSL Project
  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert('Você precisa ter pelo menos um projeto VSL cadastrado.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este VSL?')) {
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      setSelectedProjectId(remaining[0].id);
      deleteProjectFromSupabase(id);
    }
  };

  // Handler: Update Active Project Video URL (Debug / Fix)
  const handleUpdateActiveProjectUrl = (newUrl: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = { ...proj, videoUrl: newUrl };
          syncProjectToSupabase(updated);
          return updated;
        }
        return proj;
      })
    );
  };

  // Handler: Reset Projects to Initial
  const handleResetProjects = () => {
    setProjects(INITIAL_VSL_PROJECTS);
    setSelectedProjectId(INITIAL_VSL_PROJECTS[0].id);
    try {
      localStorage.setItem('vsl_projects_db', JSON.stringify(INITIAL_VSL_PROJECTS));
    } catch {}
  };

  // MODO PÁGINA DE VENDAS PÚBLICA (LANDING PAGE COM VSL INTEGRADO)
  if (activeTab === 'public_landing') {
    return (
      <VslPublicLandingPage
        project={selectedProject}
        onTrackEvent={handleTrackEvent}
        onBackToDashboard={() => setActiveTab('dashboard')}
        isPreviewMode={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* SIDEBAR NAVEGAÇÃO */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vslCount={projects.length}
        onOpenNewVslModal={() => setIsModalOpen(true)}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-neutral-950">
        {/* HEADER TOP BAR */}
        <Header
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={(proj) => setSelectedProjectId(proj.id)}
          onOpenNewVslModal={() => setIsModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenLandingPagePreview={() => setActiveTab('public_landing')}
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* MAIN BODY DEPENDENDO DA ABA ATIVA */}
        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* ABA 1: PAINEL PRINCIPAL (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* Título e Info do VSL Ativo */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-neutral-900 border border-neutral-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-2 border border-indigo-500/20">
                    <Sparkles className="w-3.5 h-3.5" /> Painel de Retenção Ativo
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight">{selectedProject.title}</h1>
                  <p className="text-xs text-neutral-400 mt-1 max-w-2xl">{selectedProject.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-center gap-2">
                    <span className="text-neutral-400">Ponto do Pitch:</span>{' '}
                    <strong className="text-amber-400 font-mono">
                      {Math.floor(selectedProject.pitchConfig.pitchTimeSeconds / 60)
                        .toString()
                        .padStart(2, '0')}
                      :{(selectedProject.pitchConfig.pitchTimeSeconds % 60).toString().padStart(2, '0')}
                    </strong>
                  </div>

                  <div className="px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-center gap-1.5 max-w-xs">
                    <span className="text-neutral-400 shrink-0">Botão CTA:</span>{' '}
                    <strong className="text-emerald-400 truncate" title={selectedProject.pitchConfig.ctaText}>
                      "{selectedProject.pitchConfig.ctaText}"
                    </strong>
                  </div>

                  <button
                    onClick={handleClearMockData}
                    className="px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Remover VSLs de exemplo e manter somente seus vídeos reais"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Limpar Mockups</span>
                  </button>

                  {projects.length > 1 && (
                    <button
                      onClick={() => handleDeleteProject(selectedProject.id)}
                      className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Excluir Este VSL</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SEÇÃO 1: PLAYER CUSTOMIZADO COM ACELERAÇÃO PSICOLÓGICA & RETENÇÃO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" />
                    Player Inteligente de VSL (Foco em Retenção)
                  </h2>
                  <span className="text-xs text-neutral-400">
                    Clique no player para simular a experiência do espectador
                  </span>
                </div>

                <VslPlayer
                  project={selectedProject}
                  onTrackEvent={handleTrackEvent}
                  onUpdatePitchConfig={(newSeconds) =>
                    handleSavePitchConfig({
                      ...selectedProject.pitchConfig,
                      pitchTimeSeconds: newSeconds,
                    })
                  }
                  onUpdateAspectRatio={handleUpdateAspectRatio}
                />
              </div>

              {/* SEÇÃO 2: ANALYTICS OVERVIEW (KPIs & FUNIL) */}
              <AnalyticsOverview project={selectedProject} />

              {/* SEÇÃO 3: GRÁFICO RECHARTS DE RETENÇÃO DE AUDIÊNCIA */}
              <RetentionChart project={selectedProject} />

              {/* SEÇÃO 4: PAINEL DE DIAGNÓSTICO & DEBUG DA TRANSMISSÃO */}
              <SystemDebugger
                selectedProject={selectedProject}
                projects={projects}
                onUpdateProjectUrl={handleUpdateActiveProjectUrl}
                onResetProjects={handleResetProjects}
              />

              {/* SEÇÃO 4: CARD GUIA DE PUBLICAÇÃO & HOSPEDAGEM DE VÍDEOS */}
              <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        🚀 Como Funciona a Publicação ao Vivo &amp; Domínio Próprio
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Entenda como disponibilizar sua VSL e Landing Page para seus clientes no ar com máxima velocidade.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('cloudflare_r2')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Configurar Cloudflare R2</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('landing_customizer')}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Layout className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Customizar Página</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <span className="text-amber-400 font-bold block">1. Aplicação no Ar (Cloud Run)</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Seu app roda em containers de alta disponibilidade. O link de preview gerado no AI Studio já é funcional para visualização e testes em tempo real.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <span className="text-emerald-400 font-bold block">2. Vídeos sem Custo no Cloudflare R2</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Conecte seu bucket do Cloudflare R2 na aba dedicada para hospedar MP4s pesados sem cobrança de taxa de tráfego (zero egress fees).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <span className="text-indigo-400 font-bold block">3. Domínio Próprio &amp; Deploy</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Você pode usar o botão no menu do AI Studio para dar Deploy em Cloud Run, exportar o código fonte (ZIP) ou enviar direto para o GitHub.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: LISTA DE VSLS (MEUS VÍDEOS) */}
          {activeTab === 'vsls' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Meus Vídeos de VSL</h1>
                  <p className="text-xs text-neutral-400">Gerencie e analise o desempenho de todos os seus vídeos de alta conversão.</p>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Cadastrar Novo VSL</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId;
                  const playRate = Math.round((proj.plays / (proj.totalViews || 1)) * 100);

                  return (
                    <div
                      key={proj.id}
                      className={`p-5 rounded-xl bg-neutral-900 border transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500/80 shadow-lg shadow-indigo-600/10'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="aspect-video w-full rounded-lg bg-neutral-950 overflow-hidden relative mb-4 border border-neutral-800 group">
                          {proj.thumbnailUrl ? (
                            <img
                              src={proj.thumbnailUrl}
                              alt={proj.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-600">
                              <Video className="w-12 h-12" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white">
                            <span className="px-2 py-0.5 rounded bg-neutral-900/90 backdrop-blur-md">
                              {Math.floor(proj.durationSeconds / 60)}m {proj.durationSeconds % 60}s
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/90 text-neutral-950">
                              Pitch: {Math.floor(proj.pitchConfig.pitchTimeSeconds / 60)}:
                              {(proj.pitchConfig.pitchTimeSeconds % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{proj.title}</h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-4">{proj.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                          <div>
                            <span className="text-neutral-500 text-[10px]">Play Rate</span>
                            <p className="font-bold text-indigo-400 text-sm">{playRate}%</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-[10px]">Visualizações</span>
                            <p className="font-bold text-neutral-200 text-sm">{proj.totalViews.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800">
                        <button
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('dashboard');
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          {isSelected ? 'Analisando Agora' : 'Selecionar VSL'}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('landing_customizer');
                          }}
                          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                          title="Customizar Landing Page deste VSL"
                        >
                          <Layout className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Excluir VSL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 3: LANDING PAGE BUILDER & CUSTOMIZER */}
          {activeTab === 'landing_customizer' && (
            <div className="space-y-6 animate-fade-in">
              <LandingPageCustomizer
                project={selectedProject}
                onSaveConfig={handleSaveLandingPageConfig}
                onPreviewLandingPage={() => setActiveTab('public_landing')}
              />
            </div>
          )}

          {/* ABA 4: SOMENTE GRÁFICO DE RETENÇÃO DEDICADO */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <RetentionChart project={selectedProject} />
              <AnalyticsOverview project={selectedProject} />
            </div>
          )}

          {/* ABA 5: CONFIGURAÇÃO DE PITCH */}
          {activeTab === 'player_builder' && (
            <div className="space-y-6 animate-fade-in">
              <PitchConfigurator
                project={selectedProject}
                onSavePitchConfig={handleSavePitchConfig}
              />
            </div>
          )}

          {/* ABA 6: LOGS DE EVENTOS */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-fade-in">
              <EventLogTable project={selectedProject} />
            </div>
          )}

          {/* ABA 7: CONEXÃO SUPABASE & SQL SCHEMA */}
          {activeTab === 'supabase' && (
            <div className="space-y-6 animate-fade-in">
              <SupabaseConfig />
            </div>
          )}

          {/* ABA 8: CLOUDFLARE R2 & S3 STORAGE BUCKET */}
          {activeTab === 'cloudflare_r2' && (
            <div className="space-y-6 animate-fade-in">
              <CloudflareR2Config onAddProject={handleAddProject} />
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CADASTRO DE NOVO VSL (LINK / FILE UPLOAD) */}
      <VslUploaderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProject={handleAddProject}
      />

      {/* MODAL DE AUTENTICAÇÃO SAAS */}
      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(session) => {
          setCurrentUser(session);
          saveLocalUserSession(session);
        }}
        onLogout={() => {
          setCurrentUser(null);
          saveLocalUserSession(null);
        }}
      />
    </div>
  );
}
