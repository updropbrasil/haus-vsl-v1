import React, { useState, useEffect, useRef } from 'react';
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
  fetchR2ConfigFromSupabase,
  hydrateSupabaseCredentials,
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

// Subcomponente para Pré-visualização do Vídeo Rodando Silencioso no Card
const CardVideoPreview: React.FC<{
  videoUrl?: string;
  secondaryVideoUrl?: string;
  thumbnailUrl?: string;
  title: string;
}> = ({ videoUrl, secondaryVideoUrl, thumbnailUrl, title }) => {
  const [currentSrc, setCurrentSrc] = useState(videoUrl);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCurrentSrc(videoUrl);
    setHasError(false);
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current && currentSrc && !hasError) {
      videoRef.current.play().catch(() => {
        // Ignora erro de autoplay restrito pelo navegador
      });
    }
  }, [currentSrc, hasError]);

  const handleVideoError = () => {
    if (currentSrc === videoUrl && secondaryVideoUrl && secondaryVideoUrl !== videoUrl) {
      console.warn('⚠️ Preview principal do card falhou. Alternando para URL secundária:', secondaryVideoUrl);
      setCurrentSrc(secondaryVideoUrl);
    } else {
      setHasError(true);
    }
  };

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (currentSrc && !hasError) {
    return (
      <div className="w-full h-full relative bg-black">
        <video
          ref={videoRef}
          src={currentSrc}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onError={handleVideoError}
          onLoadedData={() => {
            videoRef.current?.play().catch(() => {});
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
        />
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-extrabold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 z-10 shadow-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>RODANDO SILENCIOSO</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-600">
      <Video className="w-12 h-12" />
    </div>
  );
};

function getRouteInfo(allProjects: VslProject[]): { isVslRoute: boolean; matchedProjectId?: string } {
  if (typeof window === 'undefined') {
    return { isVslRoute: false };
  }

  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const vslQuery = searchParams.get('vsl') || searchParams.get('id');
  const hash = window.location.hash;

  const isVslPath =
    pathname.startsWith('/vsl') ||
    pathname.startsWith('/embed') ||
    !!vslQuery ||
    hash.includes('/vsl');

  if (!isVslPath) {
    return { isVslRoute: false };
  }

  let rawParam = '';
  if (pathname.startsWith('/vsl/')) {
    rawParam = pathname.replace(/^\/vsl\//, '');
  } else if (pathname.startsWith('/embed/')) {
    rawParam = pathname.replace(/^\/embed\//, '');
  } else if (vslQuery) {
    rawParam = vslQuery;
  } else if (hash.includes('/vsl/')) {
    rawParam = hash.split('/vsl/')[1] || '';
  }

  rawParam = rawParam.split('?')[0].split('#')[0].trim().toLowerCase();

  if (!rawParam) {
    return { isVslRoute: true };
  }

  const match = allProjects.find(
    (p) =>
      p.id.toLowerCase() === rawParam ||
      p.landingPageConfig?.slug?.toLowerCase() === rawParam
  );

  if (match) {
    return { isVslRoute: true, matchedProjectId: match.id };
  }

  const partialMatch = allProjects.find(
    (p) =>
      (p.landingPageConfig?.slug && rawParam.includes(p.landingPageConfig.slug.toLowerCase())) ||
      (p.landingPageConfig?.slug && p.landingPageConfig.slug.toLowerCase().includes(rawParam)) ||
      rawParam.includes(p.id.toLowerCase())
  );

  if (partialMatch) {
    return { isVslRoute: true, matchedProjectId: partialMatch.id };
  }

  return { isVslRoute: true };
}

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [projects, setProjects] = useState<VslProject[]>(() => {
    try {
      const stored = localStorage.getItem('vsl_projects_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonMock = parsed.filter((p: any) => {
            const url = p?.videoUrl || '';
            return !url.includes('gtv-videos-bucket') &&
                   !url.includes('commondatastorage.googleapis.com') &&
                   !url.includes('BigBuckBunny') &&
                   p.id !== 'vsl-001' && p.id !== 'vsl-002' && p.id !== 'vsl-003';
          });
          return nonMock;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const routeInfo = getRouteInfo(projects);
    return routeInfo.matchedProjectId || projects[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (
        pathname.startsWith('/vsl') ||
        pathname.startsWith('/embed') ||
        searchParams.has('vsl') ||
        searchParams.has('id') ||
        hash.includes('/vsl')
      ) {
        return 'public_landing';
      }
    }
    return 'dashboard';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<VslProject | null>(null);
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

  // Sync to localStorage and Server Persistence
  useEffect(() => {
    if (!isHydrated) return; // Evita sobrescrever os projetos no servidor antes da hidratação
    try {
      localStorage.setItem('vsl_projects_db', JSON.stringify(projects));
      if (projects.length > 0) {
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects }),
        }).catch(() => {});
      }
    } catch {
      // Fallback
    }
  }, [projects, isHydrated]);

  // Busca VSLs reais do servidor, R2 e Supabase na inicialização e ao logar
  useEffect(() => {
    async function hydrateAllCredentialsAndData() {
      // 1. Hidrata credenciais do Supabase diretamente do servidor em primeiro lugar
      await hydrateSupabaseCredentials();

      // 2. Obtém credenciais salvas do Cloudflare R2
      let r2Creds: any = null;
      try {
        const stored = localStorage.getItem('vsl_cloudflare_r2_credentials');
        if (stored) r2Creds = JSON.parse(stored);
      } catch {}

      if (!r2Creds?.accountId || !r2Creds?.accessKeyId) {
        try {
          const res = await fetch('/api/settings/r2');
          if (res.ok) {
            const data = await res.json();
            if (data?.config) r2Creds = data.config;
          }
        } catch {}
      }

      // 3. Tenta sincronizar automaticamente os vídeos do Cloudflare R2 enviando credenciais
      let syncedProjects: VslProject[] | null = null;
      try {
        const syncRes = await fetch('/api/r2/sync-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(r2Creds || {}),
            folderPath: r2Creds?.folderPath || 'vsl-haus',
          }),
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData?.projects && Array.isArray(syncData.projects) && syncData.projects.length > 0) {
            syncedProjects = syncData.projects;
          }
        }
      } catch {}

      // 4. Se não obteve do R2, busca projetos salvos no servidor Node.js
      if (!syncedProjects || syncedProjects.length === 0) {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            if (data?.projects && Array.isArray(data.projects) && data.projects.length > 0) {
              syncedProjects = data.projects;
            }
          }
        } catch {}
      }

      // Filtra e remove estritamente qualquer vídeo de exemplo ou mockup
      let activeList: VslProject[] = (syncedProjects || []).filter((p: any) => {
        const url = p?.videoUrl || '';
        return !url.includes('gtv-videos-bucket') &&
               !url.includes('commondatastorage.googleapis.com') &&
               !url.includes('BigBuckBunny') &&
               p.id !== 'vsl-001' && p.id !== 'vsl-002' && p.id !== 'vsl-003';
      });

      if (activeList.length === 0) {
        try {
          const storedLocal = localStorage.getItem('vsl_projects_db');
          if (storedLocal) {
            const parsed = JSON.parse(storedLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeList = parsed.filter((p: any) => {
                const url = p?.videoUrl || '';
                return !url.includes('gtv-videos-bucket') &&
                       !url.includes('commondatastorage.googleapis.com') &&
                       !url.includes('BigBuckBunny') &&
                       p.id !== 'vsl-001' && p.id !== 'vsl-002' && p.id !== 'vsl-003';
              });
            }
          }
        } catch {}
      }

      if (activeList.length === 0) {
        activeList = [...INITIAL_VSL_PROJECTS];
      }

      // 5. Busca VSLs cadastradas no Supabase e mescla
      try {
        const dbProjects = await fetchProjectsFromSupabase();
        if (dbProjects && dbProjects.length > 0) {
          const realDbProjects = dbProjects.filter((p: any) => {
            const url = p?.videoUrl || '';
            return !url.includes('gtv-videos-bucket') &&
                   !url.includes('commondatastorage.googleapis.com') &&
                   !url.includes('BigBuckBunny') &&
                   p.id !== 'vsl-001' && p.id !== 'vsl-002' && p.id !== 'vsl-003';
          });

          // Adiciona VSLs do Supabase que não estão na lista do R2
          realDbProjects.forEach((dbP) => {
            const exists = activeList.some((p) => p.id === dbP.id || (p.videoUrl && dbP.videoUrl && p.videoUrl.split('?')[0] === dbP.videoUrl.split('?')[0]));
            if (!exists) {
              activeList.push(dbP);
            }
          });

          // Atualiza dados de pitch e configurações da landing page vindo do Supabase
          activeList = activeList.map((p) => {
            const matchedDb = realDbProjects.find((dbP) => dbP.id === p.id || (p.videoUrl && dbP.videoUrl && p.videoUrl.split('?')[0] === dbP.videoUrl.split('?')[0]));
            if (matchedDb) {
              return {
                ...p,
                pitchConfig: matchedDb.pitchConfig || p.pitchConfig,
                landingPageConfig: matchedDb.landingPageConfig || p.landingPageConfig,
                totalViews: Math.max(p.totalViews || 0, matchedDb.totalViews || 0),
                plays: Math.max(p.plays || 0, matchedDb.plays || 0),
              };
            } else {
              syncProjectToSupabase(p);
            }
            return p;
          });
        } else {
          activeList.forEach((p) => {
            syncProjectToSupabase(p);
          });
        }
      } catch (err) {
        console.warn('Aviso na sincronização do Supabase:', err);
      }

      setProjects(activeList);

      if (activeList.length > 0) {
        try {
          localStorage.setItem('vsl_projects_db', JSON.stringify(activeList));
          fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projects: activeList }),
          }).catch(() => {});
        } catch {}
      }

      const routeInfo = getRouteInfo(activeList);
      if (routeInfo.matchedProjectId) {
        setSelectedProjectId(routeInfo.matchedProjectId);
      } else if (activeList.length > 0) {
        setSelectedProjectId(activeList[0].id);
      } else {
        setSelectedProjectId('');
      }

      setIsHydrated(true);
    }

    hydrateAllCredentialsAndData();
  }, [currentUser]);

  // Listener de Mudanças na URL para Navegação Direta de VSL Pública
  useEffect(() => {
    function processUrlRoute() {
      const routeInfo = getRouteInfo(projects);
      if (routeInfo.isVslRoute) {
        if (routeInfo.matchedProjectId) {
          setSelectedProjectId(routeInfo.matchedProjectId);
        }
        setActiveTab('public_landing');
      }
    }

    processUrlRoute();

    window.addEventListener('popstate', processUrlRoute);
    window.addEventListener('hashchange', processUrlRoute);
    return () => {
      window.removeEventListener('popstate', processUrlRoute);
      window.removeEventListener('hashchange', processUrlRoute);
    };
  }, [projects]);

  const defaultEmptyProject: VslProject = {
    id: 'novo-vsl',
    title: 'Nenhum VSL Cadastrado',
    description: 'Cadastre seu primeiro VSL ou sincronize com o Cloudflare R2 / Supabase.',
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
      ctaText: 'COMPRAR AGORA',
      ctaUrl: '',
      ctaButtonColor: '#059669',
      pulseEffect: true,
      showCountdown: true,
    },
    retentionData: [],
    events: [],
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || defaultEmptyProject;

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

  // Handler: Confirm Delete VSL Project (Exclui do R2, Supabase e Servidor)
  const confirmDeleteProject = async (id: string) => {
    const targetProject = projects.find((p) => p.id === id);
    if (!targetProject) return;

    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (remaining.length > 0) {
      setSelectedProjectId((prev) => (prev === id ? remaining[0].id : prev));
    } else {
      setSelectedProjectId('');
    }

    try {
      localStorage.setItem('vsl_projects_db', JSON.stringify(remaining));
    } catch {}

    // 1. Exclui do Supabase
    deleteProjectFromSupabase(id);

    // 2. Exclui do Servidor Node.js
    fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});

    // 3. Exclui o arquivo do bucket Cloudflare R2
    try {
      await fetch('/api/r2/delete-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          fileKey: targetProject.fileKey,
          videoUrl: targetProject.videoUrl,
        }),
      });
    } catch (err) {
      console.warn('Aviso ao excluir vídeo do R2:', err);
    }
  };

  const handleDeleteProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (target) {
      setDeletingProject(target);
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
    setSelectedProjectId(INITIAL_VSL_PROJECTS[0]?.id || '');
    try {
      localStorage.setItem('vsl_projects_db', JSON.stringify(INITIAL_VSL_PROJECTS));
    } catch {}
  };

  // MODO PÁGINA DE VENDAS PÚBLICA (LANDING PAGE COM VSL INTEGRADO)
  if (activeTab === 'public_landing') {
    const isDirectVisitor = !currentUser && window.location.pathname.startsWith('/vsl');

    return (
      <VslPublicLandingPage
        project={selectedProject}
        onTrackEvent={handleTrackEvent}
        onBackToDashboard={() => {
          if (window.location.pathname.startsWith('/vsl') || window.location.pathname.startsWith('/embed')) {
            window.history.pushState({}, '', '/');
          }
          setActiveTab('dashboard');
        }}
        isPreviewMode={!isDirectVisitor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* SIDEBAR NAVEGAÇÃO */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (window.location.pathname.startsWith('/vsl') || window.location.pathname.startsWith('/embed')) {
            window.history.pushState({}, '', '/');
          }
          setActiveTab(tab);
        }}
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
          onOpenLandingPagePreview={() => {
            const slug = selectedProject?.landingPageConfig?.slug || selectedProject?.id || '';
            window.history.pushState({}, '', `/vsl/${slug}`);
            setActiveTab('public_landing');
          }}
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

                  {selectedProject && (
                    <button
                      onClick={() => handleDeleteProject(selectedProject.id)}
                      className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Excluir este vídeo do Cloudflare R2, Supabase e do Servidor"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Meus Vídeos de VSL</h1>
                  <p className="text-xs text-neutral-400">Gerencie e analise o desempenho de todos os seus vídeos de alta conversão.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Cadastrar Novo VSL</span>
                  </button>
                </div>
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
                          <CardVideoPreview
                            videoUrl={proj.videoUrl}
                            secondaryVideoUrl={proj.secondaryVideoUrl}
                            thumbnailUrl={proj.thumbnailUrl}
                            title={proj.title}
                          />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteProject(proj.id);
                          }}
                          className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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

          {/* ABA 3: LANDING PAGE & PITCH BUILDER COMPLETO */}
          {(activeTab === 'landing_customizer' || activeTab === 'player_builder') && (
            <div className="space-y-6 animate-fade-in">
              <LandingPageCustomizer
                project={selectedProject}
                onSaveConfig={handleSaveLandingPageConfig}
                onSavePitchConfig={handleSavePitchConfig}
                onPreviewLandingPage={() => {
                  const slug = selectedProject?.landingPageConfig?.slug || selectedProject?.id || '';
                  window.history.pushState({}, '', `/vsl/${slug}`);
                  setActiveTab('public_landing');
                }}
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
              <CloudflareR2Config
                onAddProject={handleAddProject}
                onProjectsUpdated={(updatedProjects) => setProjects(updatedProjects)}
              />
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

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE VSL */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-bold text-lg pb-3 border-b border-neutral-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3>Excluir Vídeo VSL?</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Tem certeza que deseja excluir o VSL <strong className="text-white">"{deletingProject.title}"</strong>?
            </p>
            <p className="text-[11px] text-neutral-400">
              Esta ação removerá permanentemente o vídeo do Cloudflare R2, do banco de dados Supabase e de todas as landing pages.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = deletingProject.id;
                  setDeletingProject(null);
                  confirmDeleteProject(idToDelete);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer transition-colors"
              >
                Sim, Excluir VSL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUTENTICAÇÃO SAAS OBRIGATÓRIA */}
      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthModalOpen || (!currentUser && activeTab !== 'public_landing')}
        isMandatory={!currentUser && activeTab !== 'public_landing'}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(session) => {
          setCurrentUser(session);
          saveLocalUserSession(session);
          setIsAuthModalOpen(false);
        }}
        onLogout={() => {
          setCurrentUser(null);
          saveLocalUserSession(null);
        }}
      />
    </div>
  );
}
