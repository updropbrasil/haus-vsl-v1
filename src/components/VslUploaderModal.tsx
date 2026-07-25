import React, { useState, useRef } from 'react';
import {
  X,
  Link as LinkIcon,
  Upload,
  Video,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  CloudUpload
} from 'lucide-react';
import { VslProject } from '../types';
import { uploadFileToR2, sanitizeR2Credentials } from '../lib/r2';

interface VslUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (newProject: VslProject) => void;
}

export const VslUploaderModal: React.FC<VslUploaderModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [thumbFileName, setThumbFileName] = useState('');
  const [detectedDuration, setDetectedDuration] = useState<number>(180);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:5'>('16:9');
  const [pitchMinutes, setPitchMinutes] = useState(1);
  const [pitchSeconds, setPitchSeconds] = useState(30);
  const [ctaText, setCtaText] = useState('QUERO GARANTIR MINHA VAGA COM DESCONTO');
  const [ctaUrl, setCtaUrl] = useState('https://checkout.exemplo.com/vsl-oferta');
  const [ctaButtonColor, setCtaButtonColor] = useState('#059669');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploadingToR2, setIsUploadingToR2] = useState(false);
  const [r2UploadProgress, setR2UploadProgress] = useState(0);
  const [r2StatusMsg, setR2StatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Debug Console Logs
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = (msg: string) => setDebugLogs((prev) => [...prev, msg]);

  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const sampleVideos = [
    {
      label: 'Cloudflare Sample MP4 (Big Buck Bunny)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      label: 'AWS S3 Sample MP4 (Elephants Dream)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    {
      label: 'BunnyCDN Direct Stream Sample MP4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    },
  ];

  // Handler para quando o usuário seleciona um arquivo de VÍDEO do computador
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      const blobUrl = URL.createObjectURL(file);
      setVideoUrl(blobUrl);

      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }

      // Detecção automática de duração real usando elemento video oculto
      const tempVideo = document.createElement('video');
      tempVideo.src = blobUrl;
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration && !isNaN(tempVideo.duration)) {
          const duration = Math.round(tempVideo.duration);
          setDetectedDuration(duration);
        }
      };

      setErrorMsg('');

      // Verifica se o usuário tem credenciais salvas do Cloudflare R2
      try {
        const storedR2 = localStorage.getItem('vsl_cloudflare_r2_credentials');
        if (storedR2) {
          const creds = JSON.parse(storedR2);
          if (creds && (creds.accountId || creds.publicDomain)) {
            setIsUploadingToR2(true);
            setR2UploadProgress(5);
            setR2StatusMsg({ success: true, message: 'Enviando arquivo para o Cloudflare R2...' });

            const res = await uploadFileToR2(
              file,
              creds,
              'vsl-haus',
              (progress) => setR2UploadProgress(progress),
              (logMsg) => addDebugLog(logMsg)
            );

            setIsUploadingToR2(false);

            if (res.success && res.publicUrl) {
              setVideoUrl(res.publicUrl);
              setR2StatusMsg({
                success: true,
                message: '✅ Vídeo enviado e hospedado no Cloudflare R2 com Sucesso!',
              });
            } else {
              setR2StatusMsg({
                success: false,
                message: res.error || 'Não foi possível enviar ao R2. Vídeo usando pré-visualização local.',
              });
            }
          }
        }
      } catch (err) {
        setIsUploadingToR2(false);
      }
    }
  };

  // Handler para quando o usuário seleciona uma FOTO DE CAPA / THUMBNAIL do computador
  const handleThumbFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbFileName(file.name);
      const blobUrl = URL.createObjectURL(file);
      setThumbnailUrl(blobUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título do seu VSL.');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMsg('Por favor, selecione um arquivo de vídeo do seu computador ou insira uma URL.');
      return;
    }

    const totalPitchSeconds = pitchMinutes * 60 + pitchSeconds;

    // Criar o VSL REAL e ZERADO (sem números falsos ou retenção mockup)
    const newProject: VslProject = {
      id: `vsl-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Vídeo VSL cadastrado para acompanhamento de retenção real.',
      videoUrl: videoUrl.trim(),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      aspectRatio,
      durationSeconds: detectedDuration || 180,
      createdAt: new Date().toISOString(),
      totalViews: 0,
      plays: 0,
      completionCount: 0,
      avgWatchTimeSeconds: 0,
      pitchConfig: {
        pitchTimeSeconds: totalPitchSeconds,
        ctaText: ctaText.trim() || 'QUERO GARANTIR MINHA VAGA COM DESCONTO',
        ctaSubtext: '⚡ Desconto exclusivo liberado pelo tempo do vídeo',
        ctaUrl: ctaUrl.trim() || 'https://checkout.exemplo.com',
        ctaButtonColor: ctaButtonColor || '#059669',
        pulseEffect: true,
        showCountdown: true,
      },
      retentionData: [],
      events: [],
    };

    onAddProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cadastrar Novo VSL</h3>
              <p className="text-xs text-neutral-400">Faça upload direto do computador para Cloudflare R2 ou informe a URL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Abas de Origem do Vídeo */}
          <div className="flex p-1 rounded-lg bg-neutral-950 border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 rounded font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload do Computador (Cloudflare R2)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-2 rounded font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Link URL do Vídeo (MP4/WebM)</span>
            </button>
          </div>

          {/* Aba 1: Upload de Arquivos do Computador (Vídeo + Thumbnail) */}
          {activeTab === 'file' ? (
            <div className="space-y-4">
              {/* Uploader de Vídeo */}
              <div>
                <label className="block text-neutral-200 font-bold mb-1.5 flex items-center justify-between">
                  <span>1. Selecionar Arquivo de Vídeo (MP4, MOV, WebM)</span>
                  {detectedDuration > 0 && (
                    <span className="text-emerald-400 font-mono text-[11px]">
                      Duração detectada: {Math.floor(detectedDuration / 60)}m {detectedDuration % 60}s
                    </span>
                  )}
                </label>
                <div className="border-2 border-dashed border-neutral-800 hover:border-indigo-500 rounded-xl p-5 text-center bg-neutral-950/60 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <CloudUpload className="w-9 h-9 text-indigo-400 mx-auto mb-2" />
                  <p className="font-bold text-white text-xs">Clique para escolher o vídeo do seu computador</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">MP4, MOV ou WebM. Integração direta com Cloudflare R2</p>

                  {videoFileName && (
                    <div className="mt-3 space-y-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{videoFileName}</span>
                      </div>

                      {isUploadingToR2 && (
                        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 space-y-1.5 text-left">
                          <div className="flex justify-between text-[11px] font-semibold text-amber-400">
                            <span>Enviando para o Cloudflare R2...</span>
                            <span className="font-mono">{r2UploadProgress}%</span>
                          </div>
                          <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="bg-amber-500 h-full transition-all duration-200"
                              style={{ width: `${r2UploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {r2StatusMsg && !isUploadingToR2 && (
                        <div
                          className={`p-2 rounded bg-neutral-900 border text-[11px] ${
                            r2StatusMsg.success
                              ? 'border-emerald-500/30 text-emerald-400'
                              : 'border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {r2StatusMsg.message}
                        </div>
                      )}

                      {/* Debug Terminal Box */}
                      {debugLogs.length > 0 && (
                        <div className="w-full bg-black border border-neutral-800 rounded-lg p-3 font-mono text-[10px] text-left space-y-1">
                          <div className="text-emerald-400 font-bold border-b border-neutral-900 pb-1 flex justify-between items-center">
                            <span>Console de Depuração R2</span>
                            <button
                              type="button"
                              onClick={() => setDebugLogs([])}
                              className="text-[9px] text-neutral-500 hover:text-neutral-300"
                            >
                              Limpar
                            </button>
                          </div>
                          <div className="max-h-32 overflow-y-auto space-y-0.5 text-neutral-300">
                            {debugLogs.map((log, idx) => (
                              <p key={idx} className={log.includes('❌') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : 'text-neutral-300'}>
                                {log}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Uploader de Cover Photo / Thumbnail do Computador */}
              <div>
                <label className="block text-neutral-200 font-bold mb-1.5">
                  2. Foto de Capa / Thumbnail (Opcional - JPG, PNG)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border border-dashed border-neutral-800 hover:border-neutral-700 rounded-lg p-3 bg-neutral-950/60 relative flex items-center justify-between">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="flex items-center gap-2 text-neutral-300">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs">
                        {thumbFileName ? thumbFileName : 'Selecionar imagem de capa do computador'}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 text-[10px] font-semibold">
                      Escolher Imagem
                    </span>
                  </div>

                  {thumbnailUrl && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-black">
                      <img src={thumbnailUrl} alt="Capa" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Aba 2: Link de Vídeo Direct URL */
            <div className="space-y-3">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  URL Direta do Vídeo (MP4, Cloudflare Stream, AWS S3)
                </label>
                <input
                  type="url"
                  placeholder="https://pub-xxx.r2.dev/vsl-haus/meu-video.mp4"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  URL da Foto de Capa (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://pub-xxx.r2.dev/vsl-haus/minha-capa.jpg"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Botões de amostra */}
              <div className="pt-1">
                <p className="text-[11px] text-neutral-400 font-medium mb-1.5">URLs de Teste Rápido:</p>
                <div className="flex flex-wrap gap-2">
                  {sampleVideos.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setVideoUrl(sample.url);
                        if (!title) setTitle(`VSL de Teste #${idx + 1}`);
                        setErrorMsg('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-indigo-500 text-indigo-400 font-mono text-[11px] hover:bg-neutral-800 transition-all text-left cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Título e Descrição do VSL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Título da Oferta / VSL</label>
              <input
                type="text"
                placeholder="Ex: VSL Haus Vendas Imóveis"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-semibold text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Descrição / Observações</label>
              <input
                type="text"
                placeholder="Ex: Apresentação para tráfego pago Meta/Google"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Formato do Vídeo */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">
              Formato do Vídeo (Aspect Ratio)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                16:9 Deitado
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                9:16 Em Pé (Mobile)
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                1:1 Quadrado
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('4:5')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  aspectRatio === '4:5'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                4:5 Retrato
              </button>
            </div>
          </div>

          {/* Configuração do Pitch CTA */}
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Clock className="w-4 h-4" />
              <span>Configurar Botão de Oferta (CTA) e Tempo do Pitch</span>
            </div>

            <p className="text-[11px] text-neutral-400">
              Personalize o texto do botão de compra e o segundo exato em que ele surge no vídeo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-300 font-semibold mb-1">
                  Texto Escrito no Botão CTA
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Ex: QUERO GARANTIR MINHA VAGA COM DESCONTO"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-300 font-semibold mb-1">
                  Link de Checkout da Oferta
                </label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://seuempreendimento.com.br/checkout"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-indigo-400 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-300 font-semibold mb-1">
                  Tempo do Desbloqueio (Min : Seg)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={pitchMinutes}
                    onChange={(e) => setPitchMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="font-bold text-neutral-500">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={pitchSeconds}
                    onChange={(e) => setPitchSeconds(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-300 font-semibold mb-1">
                  Cor do Botão
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={ctaButtonColor}
                    onChange={(e) => setCtaButtonColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs font-bold text-neutral-300 uppercase">{ctaButtonColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer do Modal */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Cadastrar VSL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
