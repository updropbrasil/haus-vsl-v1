import React, { useState } from 'react';
import {
  Sliders,
  Clock,
  ExternalLink,
  Flame,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  Eye
} from 'lucide-react';
import { VslProject, PitchConfig } from '../types';

interface PitchConfiguratorProps {
  project: VslProject;
  onSavePitchConfig: (updatedConfig: PitchConfig) => void;
}

export const PitchConfigurator: React.FC<PitchConfiguratorProps> = ({
  project,
  onSavePitchConfig,
}) => {
  const currentConfig: PitchConfig = project?.pitchConfig || {
    pitchTimeSeconds: 90,
    ctaText: 'QUERO GARANTIR MINHA VAGA COM DESCONTO',
    ctaSubtext: '⚡ Desconto exclusivo liberado pelo tempo do vídeo',
    ctaUrl: 'https://checkout.exemplo.com/vsl-oferta',
    ctaButtonColor: '#059669',
    pulseEffect: true,
    showCountdown: true,
  };

  const [pitchMinutes, setPitchMinutes] = useState(Math.floor(currentConfig.pitchTimeSeconds / 60));
  const [pitchSeconds, setPitchSeconds] = useState(currentConfig.pitchTimeSeconds % 60);
  const [ctaText, setCtaText] = useState(currentConfig.ctaText);
  const [ctaSubtext, setCtaSubtext] = useState(currentConfig.ctaSubtext || '');
  const [ctaUrl, setCtaUrl] = useState(currentConfig.ctaUrl);
  const [ctaButtonColor, setCtaButtonColor] = useState(currentConfig.ctaButtonColor || '#4f46e5');
  const [pulseEffect, setPulseEffect] = useState(currentConfig.pulseEffect);
  const [showCountdown, setShowCountdown] = useState(currentConfig.showCountdown);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSeconds = pitchMinutes * 60 + pitchSeconds;
    const newConfig: PitchConfig = {
      pitchTimeSeconds: totalSeconds,
      ctaText,
      ctaSubtext,
      ctaUrl,
      ctaButtonColor,
      pulseEffect,
      showCountdown,
    };

    onSavePitchConfig(newConfig);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const totalSecs = pitchMinutes * 60 + pitchSeconds;
  const timeFormatted = `${pitchMinutes.toString().padStart(2, '0')}:${pitchSeconds.toString().padStart(2, '0')}`;

  return (
    <div className="w-full p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Configurador de Pitch de Vendas (CTA)</h2>
            <p className="text-xs text-neutral-400">
              Personalize o segundo exato em que o botão de compra é desbloqueado e o visual do CTA.
            </p>
          </div>
        </div>

        {isSavedSuccess && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 animate-bounce-subtle">
            <CheckCircle2 className="w-4 h-4" /> Configuração salva com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs text-neutral-300">
        {/* Painel Esquerdo: Controles */}
        <div className="space-y-5">
          {/* Campo de Tempo do Pitch */}
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
            <label className="block text-neutral-200 font-bold flex items-center gap-1.5 text-xs">
              <Clock className="w-4 h-4 text-amber-400" />
              Tempo do Desbloqueio do Pitch ({timeFormatted})
            </label>
            <p className="text-[11px] text-neutral-400">
              O botão CTA aparecerá exatamente quando o vídeo atingir {totalSecs} segundos.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-[10px] text-neutral-400">Minutos</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={pitchMinutes}
                  onChange={(e) => setPitchMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm text-center focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <span className="text-xl font-bold text-neutral-600 mt-3">:</span>
              <div className="flex-1">
                <span className="text-[10px] text-neutral-400">Segundos</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={pitchSeconds}
                  onChange={(e) => setPitchSeconds(parseInt(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm text-center focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Texto do Botão e Subtexto */}
          <div>
            <label className="block text-neutral-200 font-bold mb-1">Texto Principal do Botão (CTA)</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-white font-bold text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-neutral-200 font-bold mb-1">Subtexto de Urgência / Garantia</label>
            <input
              type="text"
              value={ctaSubtext}
              onChange={(e) => setCtaSubtext(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Link do Checkout */}
          <div>
            <label className="block text-neutral-200 font-bold mb-1">Link da Página de Checkout</label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-indigo-400 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Cor do Botão */}
          <div>
            <label className="block text-neutral-200 font-bold mb-1">Cor do Botão de Oferta</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={ctaButtonColor}
                onChange={(e) => setCtaButtonColor(e.target.value)}
                className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer p-0.5"
              />
              <span className="font-mono text-neutral-300 font-bold uppercase">{ctaButtonColor}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
          >
            Salvar Configurações de Pitch
          </button>
        </div>

        {/* Painel Direito: Pré-visualização do CTA */}
        <div className="flex flex-col justify-between p-6 rounded-lg bg-neutral-950 border border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 font-bold text-xs mb-4">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Pré-visualização do Botão de Oferta</span>
            </div>

            <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                <Flame className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>PRÉ-PRÉVIA DO SEU CTA</span>
              </div>

              <h4 className="text-lg font-black text-white">{ctaText}</h4>
              {ctaSubtext && <p className="text-xs text-neutral-300">{ctaSubtext}</p>}

              <div
                style={{ backgroundColor: ctaButtonColor }}
                className="w-full py-3.5 rounded-lg text-white font-black text-sm shadow-md flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer hover:opacity-95 transition-all"
              >
                <span>{ctaText || 'QUERO GARANTIR MINHA VAGA COM DESCONTO'}</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
            💡 <strong>Dica de Alta Conversão:</strong> Botões estilizados com contraste destacado aumentam em média <strong>14.8%</strong> a taxa de clique nos primeiros 30 segundos pós-pitch.
          </div>
        </div>
      </form>
    </div>
  );
};
