import React, { useState } from 'react';
import {
  Bug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Database,
  Cloud,
  HardDrive,
  Copy,
  Terminal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VslProject } from '../types';
import { testSupabaseConnection } from '../lib/supabase';

interface SystemDebuggerProps {
  selectedProject: VslProject;
  projects: VslProject[];
  onUpdateProjectUrl: (newUrl: string) => void;
  onResetProjects: () => void;
}

export const SystemDebugger: React.FC<SystemDebuggerProps> = ({
  selectedProject,
  projects,
  onUpdateProjectUrl,
  onResetProjects,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testVideoStatus, setTestVideoStatus] = useState<string | null>(null);
  const [isTestingVideo, setIsTestingVideo] = useState(false);
  const [supabaseTest, setSupabaseTest] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(selectedProject?.videoUrl || '');

  const handleTestCurrentVideo = () => {
    if (!selectedProject?.videoUrl) {
      setTestVideoStatus('❌ URL do vídeo está vazia.');
      return;
    }
    setIsTestingVideo(true);
    setTestVideoStatus('Testando reprodução no navegador...');

    const tempVideo = document.createElement('video');
    tempVideo.src = selectedProject.videoUrl;

    const timeout = setTimeout(() => {
      setTestVideoStatus('⚠️ Timeout: O vídeo demorou a responder ou o bucket R2 precisa de permissão de acesso público.');
      setIsTestingVideo(false);
    }, 4000);

    tempVideo.onloadedmetadata = () => {
      clearTimeout(timeout);
      setTestVideoStatus(`✅ Vídeo VÁLIDO! Duração: ${Math.round(tempVideo.duration)}s | Resolução: ${tempVideo.videoWidth}x${tempVideo.videoHeight}`);
      setIsTestingVideo(false);
    };

    tempVideo.onerror = () => {
      clearTimeout(timeout);
      setTestVideoStatus('❌ Erro de Carregamento. Verifique se a URL do Cloudflare R2 ou do arquivo MP4 está acessível.');
      setIsTestingVideo(false);
    };
  };

  const handleTestSupa = async () => {
    setIsTestingSupa(true);
    const res = await testSupabaseConnection();
    setSupabaseTest(res);
    setIsTestingSupa(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 border border-neutral-800 rounded-2xl bg-neutral-950 overflow-hidden shadow-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-neutral-900 hover:bg-neutral-850 flex items-center justify-between transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Painel de Diagnóstico & Debug de Vídeo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                VSL Haus Debug Mode
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Verifique status do player HTML5, URLs do Cloudflare R2 e conexões com o banco de dados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-neutral-400 text-xs font-semibold">
          <span>{isOpen ? 'Ocultar Diagnóstico' : 'Abrir Diagnóstico'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 space-y-6 border-t border-neutral-800 text-xs text-neutral-300 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DIAGNÓSTICO DO PLAYER & VÍDEO */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-bold text-white border-b border-neutral-800 pb-2">
                <span className="flex items-center gap-2 text-indigo-400">
                  <Play className="w-4 h-4" /> Player HTML5
                </span>
                <span className="font-mono text-[11px] text-neutral-400">{selectedProject?.id}</span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-1">URL Ativa do Vídeo:</span>
                <p className="p-2 rounded bg-neutral-950 font-mono text-[11px] text-amber-300 break-all border border-neutral-800">
                  {selectedProject?.videoUrl || 'Nenhuma URL de vídeo definida'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleTestCurrentVideo}
                  disabled={isTestingVideo}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isTestingVideo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Testar Transmissão do Vídeo Ativo</span>
                </button>

                {testVideoStatus && (
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] leading-relaxed">
                    {testVideoStatus}
                  </div>
                )}
              </div>
            </div>

            {/* CORREÇÃO RÁPIDA DE URL DO VÍDEO */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-bold text-white border-b border-neutral-800 pb-2">
                <span className="flex items-center gap-2 text-amber-400">
                  <Cloud className="w-4 h-4" /> Alterar URL do Vídeo
                </span>
                <span className="text-[10px] text-neutral-400">Cloudflare R2 / Direct MP4</span>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Cole uma URL válida do Cloudflare ou MP4:</label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://pub-xxx.r2.dev/vsl-haus/video.mp4"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg p-2 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={() => {
                  if (customUrlInput.trim()) {
                    onUpdateProjectUrl(customUrlInput.trim());
                    setTestVideoStatus('✅ URL atualizada com sucesso no VSL!');
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aplicar URL no VSL Ativo</span>
              </button>

              <div className="text-[10px] text-neutral-400 space-y-1 pt-1">
                <p>• Dica: URLs `blob:` dependem do navegador local.</p>
                <p>• Links do Cloudflare R2 funcionam em qualquer dispositivo público.</p>
              </div>
            </div>

            {/* DIAGNÓSTICO DO BANCO SUPABASE */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-bold text-white border-b border-neutral-800 pb-2">
                <span className="flex items-center gap-2 text-emerald-400">
                  <Database className="w-4 h-4" /> Banco Supabase
                </span>
                <span className="font-mono text-[10px] text-emerald-400">PostgreSQL</span>
              </div>

              <p className="text-neutral-400">
                Total de Projetos VSL Carregados: <strong className="text-white font-mono">{projects.length}</strong>
              </p>

              <button
                onClick={handleTestSupa}
                disabled={isTestingSupa}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isTestingSupa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>Testar Conexão Supabase</span>
              </button>

              {supabaseTest && (
                <div
                  className={`p-2.5 rounded font-mono text-[11px] border ${
                    supabaseTest.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {supabaseTest.message}
                </div>
              )}

              <button
                onClick={onResetProjects}
                className="w-full py-1.5 px-2 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white text-[11px] font-semibold border border-neutral-800 transition-colors cursor-pointer"
              >
                Recarregar Lista Inicial de VSLs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
