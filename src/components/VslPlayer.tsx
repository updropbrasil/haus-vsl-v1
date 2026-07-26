import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize2,
  RotateCcw,
  Zap,
  Lock,
  Unlock,
  ExternalLink,
  Clock,
  Settings,
  Flame,
  Smartphone,
  Tv,
  Square,
  RectangleHorizontal,
  LayoutTemplate,
} from 'lucide-react';
import { VslProject, VslEvent } from '../types';

interface VslPlayerProps {
  project: VslProject;
  onTrackEvent: (event: Omit<VslEvent, 'id' | 'createdAt'>) => void;
  onUpdatePitchConfig?: (newPitchSeconds: number) => void;
  onUpdateAspectRatio?: (aspectRatio: '16:9' | '9:16' | '1:1' | '4:5') => void;
  isPublicView?: boolean;
}

export const VslPlayer: React.FC<VslPlayerProps> = ({
  project,
  onTrackEvent,
  onUpdatePitchConfig,
  onUpdateAspectRatio,
  isPublicView = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Player local state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(project.durationSeconds || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSmartUnmuteOverlay, setShowSmartUnmuteOverlay] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const [autoDetectedAspect, setAutoDetectedAspect] = useState<'16:9' | '9:16' | '1:1' | '4:5' | null>(null);

  // Selected aspect ratio state (auto-detected or project configured)
  const currentAspect = autoDetectedAspect || project.aspectRatio || '16:9';

  // Auto-resume state
  const [savedTime, setSavedTime] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Fallback URL state (Se o vídeo principal falhar por adblocker ou rede, alterna entre streaming e domínio público)
  const [usingFallbackUrl, setUsingFallbackUrl] = useState(false);
  const [usingStreamUrl, setUsingStreamUrl] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  let activeVideoSrc = project.videoUrl;
  if (project.fileKey && !usingFallbackUrl) {
    activeVideoSrc = `/api/r2/stream?key=${encodeURIComponent(project.fileKey)}`;
  } else if (usingStreamUrl) {
    const rawKey = project.fileKey || (project.videoUrl?.includes('key=')
      ? decodeURIComponent(project.videoUrl.split('key=')[1]?.split('&')[0] || '')
      : project.videoUrl?.replace(/^https?:\/\/[^/]+\//, ''));
    if (rawKey) {
      activeVideoSrc = `/api/r2/stream?key=${encodeURIComponent(rawKey)}`;
    } else if (project.secondaryVideoUrl) {
      activeVideoSrc = project.secondaryVideoUrl;
    }
  } else if (usingFallbackUrl && project.secondaryVideoUrl) {
    activeVideoSrc = project.secondaryVideoUrl;
  }

  const handleVideoError = () => {
    if (!usingFallbackUrl && project.secondaryVideoUrl && project.secondaryVideoUrl !== activeVideoSrc) {
      console.warn('⚠️ URL principal do vídeo falhou. Alternando para URL secundária!');
      setUsingFallbackUrl(true);
    } else if (!usingStreamUrl) {
      console.warn('⚠️ Alternando para a rota de streaming direto do servidor Express!');
      setUsingStreamUrl(true);
    } else if (retryCount < 2) {
      console.warn(`🔄 Tentando recarregar o vídeo (tentativa ${retryCount + 1})...`);
      setRetryCount((prev) => prev + 1);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 500);
    } else {
      setHasVideoError(true);
    }
  };

  // Pitch state
  const [isPitchUnlocked, setIsPitchUnlocked] = useState(false);

  // Milestone tracking markers
  const trackedMilestones = useRef<{ [key: string]: boolean }>({
    milestone_10: false,
    milestone_25: false,
    milestone_50: false,
    milestone_75: false,
    milestone_100: false,
  });

  // Escuta evento de mudança de tela cheia (native fullscreen change)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Autoplay mudo imediato ao carregar a página / trocar vídeo
  useEffect(() => {
    setHasVideoError(false);
    setIsPitchUnlocked(false);
    setHasStartedPlaying(false);
    setShowSmartUnmuteOverlay(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.muted = true;
      setIsMuted(true);
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Autoplay mudo aguardando interação:', err);
        });
    }
  }, [activeVideoSrc]);

  // Função acionada ao clicar para ativar o som e ir para tela cheia
  const handleUnmuteAndFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;

    // 1. Reiniciar o vídeo do começo (00:00)
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPitchUnlocked(false);

    // 2. Desmutar o áudio (Volume 100%)
    videoRef.current.muted = false;
    setIsMuted(false);
    setVolume(1);
    videoRef.current.volume = 1;

    // 3. Garantir Reprodução
    videoRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setShowSmartUnmuteOverlay(false);
        setShowResumeBanner(false);
        setHasStartedPlaying(true);
        onTrackEvent({
          vslId: project.id,
          eventType: 'play',
          timestampSeconds: 0,
          percentage: 0,
          device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
        });
      })
      .catch((err) => {
        console.warn('Erro ao reproduzir vídeo:', err);
      });

    // 4. Ativar Tela Cheia (Fullscreen Native)
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
      (videoRef.current as any).webkitEnterFullscreen();
    }
  };

  // Load saved progress from localStorage if exists
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`vsl_progress_${project.id}`);
      if (stored) {
        const time = parseFloat(stored);
        if (time > 5 && time < (duration || 300) - 10) {
          setSavedTime(time);
          setShowResumeBanner(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [project.id, duration]);

  // Handle video duration and auto-detect intrinsic video dimensions
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);

      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (vw && vh) {
        const ratio = vw / vh;
        let detected: '16:9' | '9:16' | '1:1' | '4:5' = '16:9';
        if (ratio < 0.7) {
          detected = '9:16';
        } else if (ratio >= 0.7 && ratio <= 0.88) {
          detected = '4:5';
        } else if (ratio > 0.88 && ratio <= 1.15) {
          detected = '1:1';
        } else {
          detected = '16:9';
        }
        setAutoDetectedAspect(detected);
        if (onUpdateAspectRatio && !project.aspectRatio) {
          onUpdateAspectRatio(detected);
        }
      }
    }
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowSmartUnmuteOverlay(false);
          setShowResumeBanner(false);
          if (!hasStartedPlaying) {
            setHasStartedPlaying(true);
            onTrackEvent({
              vslId: project.id,
              eventType: 'play',
              timestampSeconds: videoRef.current ? Math.round(videoRef.current.currentTime) : 0,
              percentage: 0,
              device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
            });
          }
        })
        .catch((err) => {
          console.warn('Autoplay prevented', err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);

      // Track pause event
      const currentSec = Math.round(videoRef.current.currentTime);
      const pct = Math.round((currentSec / (duration || 1)) * 100);
      onTrackEvent({
        vslId: project.id,
        eventType: 'pause',
        timestampSeconds: currentSec,
        percentage: pct,
        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
      });

      try {
        localStorage.setItem(`vsl_progress_${project.id}`, currentSec.toString());
      } catch {}
    }
  };

  // Time Update & Tracking Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const currentSec = videoRef.current.currentTime;
    setCurrentTime(currentSec);

    const videoDur = duration || videoRef.current.duration || 1;
    const currentPercentage = (currentSec / videoDur) * 100;

    // Pitch Unlock check (Apenas desbloqueia se o usuário já clicou para assistir com som)
    if (
      project.pitchConfig &&
      hasStartedPlaying &&
      !showSmartUnmuteOverlay &&
      !isMuted &&
      currentSec >= project.pitchConfig.pitchTimeSeconds &&
      !isPitchUnlocked
    ) {
      setIsPitchUnlocked(true);
      onTrackEvent({
        vslId: project.id,
        eventType: 'pitch_reached',
        timestampSeconds: Math.round(currentSec),
        percentage: Math.round(currentPercentage),
        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
      });
    }

    // Check milestones
    const milestones = [
      { key: 'milestone_10', pct: 10 },
      { key: 'milestone_25', pct: 25 },
      { key: 'milestone_50', pct: 50 },
      { key: 'milestone_75', pct: 75 },
      { key: 'milestone_100', pct: 99 },
    ];

    milestones.forEach(({ key, pct }) => {
      if (currentPercentage >= pct && !trackedMilestones.current[key]) {
        trackedMilestones.current[key] = true;
        onTrackEvent({
          vslId: project.id,
          eventType: key as any,
          timestampSeconds: Math.round(currentSec),
          percentage: Math.round(currentPercentage),
          device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
        });
      }
    });

    if (Math.floor(currentSec) % 5 === 0) {
      try {
        localStorage.setItem(`vsl_progress_${project.id}`, Math.round(currentSec).toString());
      } catch {}
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * (duration || 1);

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const resumeFromSavedTime = () => {
    if (videoRef.current && savedTime) {
      videoRef.current.currentTime = savedTime;
      setCurrentTime(savedTime);
      setShowResumeBanner(false);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (nextMuted) {
      setVolume(0);
    } else {
      setVolume(0.8);
      videoRef.current.volume = 0.8;
    }
    setShowSmartUnmuteOverlay(false);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // BARRA DE PROGRESSO COM GATILHO PSICOLÓGICO DE ACELERAÇÃO (0-10%)
  const realPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  let visualPercentage = realPercentage;
  if (realPercentage <= 10) {
    visualPercentage = realPercentage * 1.25;
  } else {
    visualPercentage = 12.5 + ((realPercentage - 10) * (87.5 / 90));
  }
  const clampedVisualPercentage = Math.min(100, Math.max(0, visualPercentage));
  const secondsUntilPitch = Math.max(0, Math.ceil(project.pitchConfig.pitchTimeSeconds - currentTime));

  // ASPECT RATIO STYLING CLASSES
  const getContainerAspectClass = () => {
    switch (currentAspect) {
      case '9:16':
        return 'aspect-[9/16] w-full max-w-[320px] sm:max-w-[380px] max-h-[75vh] mx-auto shadow-2xl';
      case '1:1':
        return 'aspect-square w-full max-w-[420px] max-h-[65vh] mx-auto shadow-2xl';
      case '4:5':
        return 'aspect-[4/5] w-full max-w-[380px] max-h-[70vh] mx-auto shadow-2xl';
      case '16:9':
      default:
        return 'aspect-video w-full max-w-4xl mx-auto shadow-2xl';
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* BARRA DE SELEÇÃO DE FORMATO DO VÍDEO (Apenas no Painel do Admin) */}
      {!isPublicView && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white">Formato do Vídeo (Auto-Detectado):</span>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => onUpdateAspectRatio?.('16:9')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentAspect === '16:9'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span>16:9 Deitado</span>
            </button>

            <button
              onClick={() => onUpdateAspectRatio?.('9:16')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentAspect === '9:16'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16 Em Pé (Mobile VSL)</span>
            </button>

            <button
              onClick={() => onUpdateAspectRatio?.('1:1')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentAspect === '1:1'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>1:1 Quadrado</span>
            </button>
          </div>
        </div>
      )}

      {/* Container Principal do Player VSL (Permite Fullscreen Native) */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 group transition-all duration-300 flex flex-col justify-between ${getContainerAspectClass()}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowSpeedMenu(false);
        }}
      >
        {/* Banner de Aviso de Aceleração Psicológica Ativa (Apenas Admin) */}
        {!isPublicView && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-medium backdrop-blur-md shadow-lg pointer-events-none">
            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Gatilho Acelerado (0-10%)</span>
          </div>
        )}

        {/* Botão para Sair da Tela Cheia quando Ativo */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 px-3.5 py-2 rounded-full bg-black/80 hover:bg-neutral-900 text-white font-bold text-xs shadow-2xl border border-neutral-700 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Minimize2 className="w-4 h-4 text-indigo-400" />
            <span>Sair de Tela Cheia</span>
          </button>
        )}

        {/* Video HTML5 Tag Area */}
        <div
          className={`relative w-full h-full bg-black flex-1 flex items-center justify-center overflow-hidden ${
            !isPublicView ? 'cursor-pointer' : ''
          }`}
          onClick={!isPublicView ? togglePlay : undefined}
        >
          <video
            key={activeVideoSrc}
            ref={videoRef}
            poster={project.thumbnailUrl}
            className="w-full h-full object-contain"
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              setHasVideoError(false);
              setRetryCount(0);
              handleLoadedMetadata();
            }}
            onError={handleVideoError}
            onEnded={() => {
              setIsPlaying(false);
              onTrackEvent({
                vslId: project.id,
                eventType: 'milestone_100',
                timestampSeconds: Math.round(duration),
                percentage: 100,
                device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
              });
            }}
            playsInline
            muted
            autoPlay
            {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as any)}
          >
            <source src={activeVideoSrc} type="video/mp4" />
            <source src={activeVideoSrc} type="video/webm" />
            <source src={activeVideoSrc} />
          </video>

          {/* Overlay de Erro no Vídeo com Botão de Recarregar */}
          {hasVideoError && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/95 backdrop-blur-md p-5 sm:p-6 text-center overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-2.5 shrink-0">
                <Flame className="w-6 h-6" />
              </div>

              <h4 className="text-white font-extrabold text-sm sm:text-base mb-1.5">
                Aguardando Conexão do Vídeo
              </h4>

              <p className="text-neutral-300 text-xs max-w-md leading-relaxed mb-3">
                O vídeo está em processo de sincronização com o servidor. Clique no botão abaixo para tentar reconectar instantaneamente.
              </p>

              <button
                onClick={() => {
                  setHasVideoError(false);
                  setRetryCount(0);
                  setUsingStreamUrl(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer mb-3"
              >
                Tentar Reconectar Vídeo
              </button>

              {/* URL do Vídeo para Depuração */}
              {activeVideoSrc && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 max-w-md w-full mb-3 text-left font-mono text-[10px] text-neutral-400 truncate select-all">
                  <span className="text-neutral-500 font-sans font-semibold mr-1">URL:</span>
                  {activeVideoSrc}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeVideoSrc && (
                  <a
                    href={activeVideoSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 border border-neutral-700 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Abrir Link em Nova Aba</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setUsingStreamUrl((prev) => !prev);
                    setHasVideoError(false);
                    setRetryCount(0);
                    setTimeout(() => videoRef.current?.load(), 100);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 border border-neutral-700 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Alternar Rota ({usingStreamUrl ? 'URL Direta' : 'Proxy Stream'})</span>
                </button>

                <button
                  onClick={() => {
                    setHasVideoError(false);
                    setRetryCount(0);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay de Áudio / Smart Unmute com Tela Cheia Automática */}
          {showSmartUnmuteOverlay && !hasVideoError && (
            <div
              onClick={handleUnmuteAndFullscreen}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 text-center animate-fade-in cursor-pointer select-none group/unmute"
            >
              <div className="relative mb-2 sm:mb-4">
                <div className="absolute -inset-3 sm:-inset-6 rounded-full bg-indigo-500/30 animate-ping" />
                <div className="relative flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-2xl group-hover/unmute:scale-110 transition-all duration-300">
                  <Volume2 className="w-6 h-6 sm:w-10 sm:h-10 fill-current animate-bounce" />
                </div>
              </div>

              <div className="px-3.5 py-2 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl bg-neutral-900/90 border border-indigo-500/50 shadow-2xl space-y-0.5 sm:space-y-1.5 max-w-[280px] sm:max-w-sm">
                <h3 className="text-xs sm:text-base font-black text-white tracking-wider uppercase flex items-center justify-center gap-1.5">
                  <span>🔊 CLIQUE PARA ASSISTIR COM SOM</span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-neutral-300 font-medium leading-tight sm:leading-relaxed">
                  O vídeo reiniciará do começo com áudio em Tela Cheia 🎬
                </p>
              </div>
            </div>
          )}

          {/* Banner de Resume de Onde Parou */}
          {showResumeBanner && savedTime && !isPlaying && (
            <div className="absolute top-4 left-4 z-30 max-w-md p-3.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 shadow-xl flex items-center justify-between gap-3 animate-slide-down">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-neutral-200">
                    Você parou em <span className="text-indigo-400 font-bold">{formatTime(savedTime)}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400">Deseja continuar de onde parou?</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resumeFromSavedTime();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  Continuar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowResumeBanner(false);
                  }}
                  className="px-2 py-1 rounded text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
            </div>
          )}

          {/* Big Center Play Icon Overlay on Pause */}
          {!isPlaying && !showSmartUnmuteOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="w-16 h-16 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-indigo-400 shadow-2xl transform hover:scale-110 transition-all">
                <Play className="w-8 h-8 fill-indigo-400 ml-1" />
              </div>
            </div>
          )}

          {/* OVERLAY DO BOTÃO DA OFERTA (DENTRO DO PLAYER - COMPACTO E ENQUADRADO PARA MOBILE) */}
          {isPitchUnlocked && hasStartedPlaying && !showSmartUnmuteOverlay && !isMuted && (
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm sm:max-w-md w-[92%] p-1 sm:p-2 animate-scale-up pointer-events-auto">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <a
                  href={project.pitchConfig.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    onTrackEvent({
                      vslId: project.id,
                      eventType: 'cta_clicked',
                      timestampSeconds: Math.round(currentTime),
                      percentage: Math.round(realPercentage),
                      device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
                    });
                  }}
                  style={{
                    backgroundColor: project.pitchConfig.ctaButtonColor || '#059669',
                    boxShadow: `0 0 25px ${project.pitchConfig.ctaButtonColor || '#059669'}80`,
                  }}
                  className="w-full py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-xl text-white font-black text-xs sm:text-base leading-tight shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 border border-white/30 text-center break-words"
                >
                  <span className="line-clamp-2">{project.pitchConfig.ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] shrink-0" />
                </a>

                {project.pitchConfig.ctaSubtext && (
                  <p className="text-[10px] sm:text-xs text-white/95 font-bold drop-shadow-md bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 max-w-full text-center truncate">
                    {project.pitchConfig.ctaSubtext}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE CONTROLES CUSTOMIZADA VSL (Exibida Apenas no Dashboard Admin para Testes) */}
        {!isPublicView ? (
          <div
            className={`px-4 pt-2 pb-3 bg-neutral-950 transition-opacity duration-300 shrink-0 ${
              isHovered || !isPlaying ? 'opacity-100' : 'opacity-80 md:opacity-0'
            }`}
          >
            {/* BARRA DE PROGRESSO VISUAL COM GATILHO PSICOLÓGICO */}
            <div className="relative mb-3 group/timeline cursor-pointer" onClick={handleSeek}>
              {realPercentage <= 10 && realPercentage > 0 && (
                <div
                  style={{ left: `${clampedVisualPercentage}%` }}
                  className="absolute -top-8 -translate-x-1/2 z-20 px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-bold text-white shadow-md whitespace-nowrap pointer-events-none transition-all"
                >
                  🚀 Velocidade Inicial Boosted
                </div>
              )}

              <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden relative border border-neutral-700">
                <div
                  className={`h-full rounded-full transition-all duration-150 relative ${
                    realPercentage <= 10
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${clampedVisualPercentage}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full animate-pulse" />
                </div>
              </div>

              {duration > 0 && project.pitchConfig && (
                <div
                  style={{ left: `${(project.pitchConfig.pitchTimeSeconds / duration) * 100}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 rounded shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                  title={`Ponto do Pitch: ${formatTime(project.pitchConfig.pitchTimeSeconds)}`}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
              )}
            </div>

            {/* Botões e Status de Controle */}
            <div className="flex items-center justify-between text-neutral-300 text-xs font-medium">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-100 transition-colors border border-neutral-700 cursor-pointer"
                  title={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-indigo-400" /> : <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />}
                </button>

                <div className="flex items-center gap-1.5 group/vol">
                  <button onClick={toggleMute} className="p-1.5 hover:text-white transition-colors cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-neutral-300" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 rounded accent-indigo-500 bg-neutral-800 cursor-pointer"
                  />
                </div>

                <div className="text-neutral-400 font-mono text-[11px] ml-1">
                  <span className="text-neutral-100 font-semibold">{formatTime(currentTime)}</span> / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800">
                  {isPitchUnlocked ? (
                    <span className="flex items-center gap-1 text-indigo-400 font-semibold text-[11px]">
                      <Unlock className="w-3.5 h-3.5" /> Pitch Desbloqueado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                      <Lock className="w-3.5 h-3.5" /> Pitch em: {formatTime(secondsUntilPitch)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-neutral-400" />
                    {playbackSpeed}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-24 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-1 z-40 flex flex-col gap-0.5">
                      {[1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`w-full px-2 py-1 rounded text-left text-xs font-semibold transition-colors cursor-pointer ${
                            playbackSpeed === spd ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          {spd}x {spd === 1 ? '(Padrão)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
                  title="Tela Cheia"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Linha Fina de Progresso Visual Não-Interativa para a VSL Pública */
          <div className="w-full h-1 bg-neutral-900 relative overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${clampedVisualPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* SEÇÃO DO CTA DO PITCH EM TELA NORMAL / MOBILE */}
      <div className="w-full max-w-4xl transition-all duration-700 ease-out">
        {isPitchUnlocked && hasStartedPlaying && !showSmartUnmuteOverlay && !isMuted ? (
          <div
            className="p-4 sm:p-8 rounded-2xl bg-neutral-900/90 border border-emerald-500/40 text-center animate-fade-in flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group"
            style={{
              boxShadow: `0 0 40px ${project.pitchConfig.ctaButtonColor || '#059669'}25`,
            }}
          >
            {/* Ambient Background Glow */}
            <div
              className="absolute -inset-1 opacity-20 blur-xl pointer-events-none transition-all duration-500 group-hover:opacity-30"
              style={{ backgroundColor: project.pitchConfig.ctaButtonColor || '#059669' }}
            />

            <div className="max-w-lg w-full flex flex-col items-center gap-3 relative z-10">
              <a
                href={project.pitchConfig.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  onTrackEvent({
                    vslId: project.id,
                    eventType: 'cta_clicked',
                    timestampSeconds: Math.round(currentTime),
                    percentage: Math.round(realPercentage),
                    device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
                  });
                }}
                style={{
                  backgroundColor: project.pitchConfig.ctaButtonColor || '#059669',
                  boxShadow: `0 10px 30px ${project.pitchConfig.ctaButtonColor || '#059669'}60`,
                }}
                className="w-full py-4 sm:py-5 px-5 sm:px-8 rounded-xl text-white font-black text-sm sm:text-lg leading-snug shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2.5 sm:gap-3 text-center break-words border border-white/20"
              >
                <span>{project.pitchConfig.ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
                <ExternalLink className="w-5 h-5 stroke-[2.5] shrink-0" />
              </a>

              {project.pitchConfig.ctaSubtext && (
                <p className="text-xs sm:text-sm text-neutral-300 font-semibold text-center leading-relaxed">
                  {project.pitchConfig.ctaSubtext}
                </p>
              )}

              {/* Selo de Garantia e Segurança para Conversão Mobile */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-800/80 w-full">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  🔒 Compra 100% Segura
                </span>
                <span>•</span>
                <span>⚡ Acesso Imediato</span>
              </div>
            </div>
          </div>
        ) : (
          !isPublicView && (
            <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  O botão da oferta será desbloqueado em{' '}
                  <strong className="text-amber-400 font-mono font-bold">{formatTime(secondsUntilPitch)}</strong> do vídeo
                  ({formatTime(project.pitchConfig.pitchTimeSeconds)}).
                </span>
              </div>

              {onUpdatePitchConfig && (
                <button
                  onClick={() => onUpdatePitchConfig(5)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Muda o tempo do Pitch para 5 segundos para testar o surgimento do botão"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Testar Pitch aos 5s</span>
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* BARRA FIXA STICKY CTA NO RODAPÉ MOBILE (Alta Conversão para 98% de Tráfego Mobile) */}
      {isPitchUnlocked && hasStartedPlaying && !showSmartUnmuteOverlay && !isMuted && isPublicView && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-2.5 sm:hidden bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800/90 shadow-[0_-10px_25px_rgba(0,0,0,0.8)] animate-fade-in pointer-events-auto">
          <a
            href={project.pitchConfig.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              onTrackEvent({
                vslId: project.id,
                eventType: 'cta_clicked',
                timestampSeconds: Math.round(currentTime),
                percentage: Math.round(realPercentage),
                device: 'Mobile',
              });
            }}
            style={{
              backgroundColor: project.pitchConfig.ctaButtonColor || '#059669',
              boxShadow: `0 0 20px ${project.pitchConfig.ctaButtonColor || '#059669'}90`,
            }}
            className="w-full py-3 px-4 rounded-xl text-white font-black text-xs leading-tight shadow-2xl uppercase tracking-wide flex items-center justify-center gap-2 border border-white/25 active:scale-95 transition-transform text-center"
          >
            <span className="line-clamp-1">{project.pitchConfig.ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
            <ExternalLink className="w-4 h-4 stroke-[2.5] shrink-0" />
          </a>
        </div>
      )}
    </div>
  );
};
