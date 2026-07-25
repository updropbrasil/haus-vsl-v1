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

  // Fallback URL state (Se o vídeo principal falhar por adblocker ou rede, muda pro domínio secundário)
  const [usingFallbackUrl, setUsingFallbackUrl] = useState(false);
  const activeVideoSrc = usingFallbackUrl && project.secondaryVideoUrl ? project.secondaryVideoUrl : project.videoUrl;

  const handleVideoError = () => {
    if (!usingFallbackUrl && project.secondaryVideoUrl) {
      console.warn('⚠️ URL principal do vídeo falhou. Alternando automaticamente para o Domínio Secundário / Reserva!');
      setUsingFallbackUrl(true);
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
    if (videoRef.current) {
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
  }, [project.videoUrl]);

  // Função acionada ao clicar para ativar o som e ir para tela cheia
  const handleUnmuteAndFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;

    // 1. Reiniciar o vídeo do começo (00:00)
    videoRef.current.currentTime = 0;
    setCurrentTime(0);

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
        if (!hasStartedPlaying) {
          setHasStartedPlaying(true);
          onTrackEvent({
            vslId: project.id,
            eventType: 'play',
            timestampSeconds: 0,
            percentage: 0,
            device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
          });
        }
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

    // Pitch Unlock check
    if (project.pitchConfig && currentSec >= project.pitchConfig.pitchTimeSeconds && !isPitchUnlocked) {
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
        return 'aspect-[9/16] w-full max-w-[340px] sm:max-w-[380px] mx-auto shadow-2xl';
      case '1:1':
        return 'aspect-square w-full max-w-[480px] mx-auto shadow-2xl';
      case '4:5':
        return 'aspect-[4/5] w-full max-w-[420px] mx-auto shadow-2xl';
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
            ref={videoRef}
            src={activeVideoSrc}
            poster={project.thumbnailUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
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
          />

          {/* Overlay de Áudio / Smart Unmute com Tela Cheia Automática */}
          {showSmartUnmuteOverlay && (
            <div
              onClick={handleUnmuteAndFullscreen}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center animate-fade-in cursor-pointer select-none group/unmute"
            >
              <div className="relative mb-5">
                <div className="absolute -inset-6 rounded-full bg-indigo-500/30 animate-ping" />
                <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-2xl group-hover/unmute:scale-110 transition-all duration-300">
                  <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 fill-current animate-bounce" />
                </div>
              </div>

              <div className="px-6 py-3.5 rounded-2xl bg-neutral-900/90 border border-indigo-500/50 shadow-2xl space-y-1.5 max-w-sm">
                <h3 className="text-sm sm:text-base font-black text-white tracking-wider uppercase flex items-center justify-center gap-2">
                  <span>🔊 CLIQUE PARA ASSISTIR COM SOM</span>
                </h3>
                <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
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

          {/* OVERLAY DO BOTÃO DA OFERTA (DENTRO DO PLAYER - CENTRALIZADO E COMPACTO) */}
          {isPitchUnlocked && (
            <div className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-md w-11/12 p-2 sm:p-3 animate-fade-in pointer-events-auto">
              <div className="flex flex-col items-center gap-2 text-center">
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
                  style={{ backgroundColor: project.pitchConfig.ctaButtonColor || '#059669' }}
                  className="w-full py-3.5 px-6 rounded-xl text-white font-black text-sm sm:text-base shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2 border border-white/20"
                >
                  <span>{project.pitchConfig.ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                </a>

                {project.pitchConfig.ctaSubtext && (
                  <p className="text-xs text-white/90 font-semibold drop-shadow-md bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 max-w-full truncate">
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

      {/* SEÇÃO DO CTA DO PITCH EM TELA NORMAL */}
      <div className="w-full max-w-4xl transition-all duration-700 ease-out">
        {isPitchUnlocked ? (
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center animate-fade-in flex flex-col items-center justify-center">
            <div className="max-w-md w-full flex flex-col items-center gap-2.5">
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
                style={{ backgroundColor: project.pitchConfig.ctaButtonColor || '#059669' }}
                className="w-full py-4 px-8 rounded-xl text-white font-black text-base sm:text-lg shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-3"
              >
                <span>{project.pitchConfig.ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
                <ExternalLink className="w-5 h-5 stroke-[2.5]" />
              </a>

              {project.pitchConfig.ctaSubtext && (
                <p className="text-xs text-neutral-400 font-medium text-center">
                  {project.pitchConfig.ctaSubtext}
                </p>
              )}
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
    </div>
  );
};
