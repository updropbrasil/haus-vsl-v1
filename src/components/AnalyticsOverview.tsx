import React from 'react';
import {
  Users,
  Play,
  Clock,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  ShieldCheck,
  Info
} from 'lucide-react';
import { VslProject } from '../types';

interface AnalyticsOverviewProps {
  project: VslProject;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ project }) => {
  const totalViews = project.totalViews || 0;
  const plays = project.plays || 0;
  const playRate = totalViews > 0 ? Math.round((plays / totalViews) * 100) : 0;
  const completionCount = project.completionCount || 0;
  const completionRate = plays > 0 ? Math.round((completionCount / plays) * 100) : 0;

  // Pitch retention calculation from real retentionData or real events
  const pitchSec = project.pitchConfig?.pitchTimeSeconds || 90;
  const pitchPt = project.retentionData?.find((pt) => pt.second >= pitchSec);
  
  // Real retention rate at pitch point
  let pitchRetention = 0;
  if (pitchPt && pitchPt.retentionRate !== undefined) {
    pitchRetention = pitchPt.retentionRate;
  } else if (plays > 0 && project.events && project.events.length > 0) {
    const pitchEvents = project.events.filter((e) => e.eventType === 'pitch_reached').length;
    pitchRetention = Math.round((pitchEvents / plays) * 100);
  }
  pitchRetention = Math.min(100, Math.max(0, pitchRetention));

  // Real milestones calculation from project.events if plays > 0
  const count10 = project.events?.filter((e) => e.eventType === 'milestone_10').length || 0;
  const count25 = project.events?.filter((e) => e.eventType === 'milestone_25').length || 0;
  const count50 = project.events?.filter((e) => e.eventType === 'milestone_50').length || 0;
  const count75 = project.events?.filter((e) => e.eventType === 'pitch_reached' || e.eventType === 'milestone_75').length || 0;
  const count100 = project.events?.filter((e) => e.eventType === 'milestone_100').length || 0;

  const clampRate = (val: number) => Math.min(100, Math.max(0, Math.round(val)));

  // Calculate percentage over total plays or fallback to retentionData (strictly 0 - 100%)
  const pct10 = plays > 0 ? clampRate(count10 > 0 ? (count10 / plays) * 100 : (project.retentionData?.[2]?.retentionRate || 0)) : 0;
  const pct25 = plays > 0 ? clampRate(count25 > 0 ? (count25 / plays) * 100 : (project.retentionData?.[5]?.retentionRate || 0)) : 0;
  const pct50 = plays > 0 ? clampRate(count50 > 0 ? (count50 / plays) * 100 : (project.retentionData?.[10]?.retentionRate || 0)) : 0;
  const pct75 = plays > 0 ? clampRate(count75 > 0 ? (count75 / plays) * 100 : pitchRetention) : 0;
  const pct100 = plays > 0 ? clampRate(count100 > 0 ? (count100 / plays) * 100 : completionRate) : 0;

  const milestones = [
    { label: 'Hook (0 - 10%)', pct: 10, retention: pct10, color: 'bg-emerald-500' },
    { label: 'Engajamento (25%)', pct: 25, retention: pct25, color: 'bg-teal-500' },
    { label: 'História (50%)', pct: 50, retention: pct50, color: 'bg-blue-500' },
    { label: 'Pitch Liberado (75%)', pct: 75, retention: pct75, color: 'bg-amber-500' },
    { label: 'Conclusão (100%)', pct: 100, retention: pct100, color: 'bg-indigo-500' },
  ];

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec)) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const isNewVideo = plays === 0 && totalViews === 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Aviso de Vídeo Novo Sem Reproduções */}
      {isNewVideo && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Métricas de Analytics em Tempo Real</p>
              <p className="text-neutral-300">
                Este vídeo é novo e possui <strong>0 visualizações</strong>. Conforme os espectadores assistirem, os números e gráficos serão atualizados com dados 100% reais de reprodução.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Visualizações Totais */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              {totalViews > 0 ? 'Dados Reais' : 'Aguardando Views'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">Visualizações do Player</p>
          <h3 className="text-2xl font-black text-white mt-1">{totalViews.toLocaleString('pt-BR')}</h3>
          <p className="text-[11px] text-neutral-500 mt-2">Leads únicos que carregaram o vídeo</p>
        </div>

        {/* KPI 2: Taxa de Play */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Play className="w-5 h-5 fill-indigo-400" />
            </span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              Play Rate
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">Taxa de Play (Play Rate)</p>
          <h3 className="text-2xl font-black text-white mt-1">{playRate}%</h3>
          <p className="text-[11px] text-neutral-500 mt-2">
            <strong className="text-indigo-400 font-semibold">{plays.toLocaleString('pt-BR')}</strong> reproduções confirmadas
          </p>
        </div>

        {/* KPI 3: Retenção no Pitch */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Target className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Momento Oferta
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">Retenção no Pitch ({formatSecs(pitchSec)})</p>
          <h3 className="text-2xl font-black text-amber-400 mt-1">{pitchRetention}%</h3>
          <p className="text-[11px] text-neutral-500 mt-2">Leads que chegaram até a liberação do CTA</p>
        </div>

        {/* KPI 4: Tempo Médio de Retenção */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Assistência Real
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">Tempo Médio Assistido</p>
          <h3 className="text-2xl font-black text-white mt-1">{formatSecs(project.avgWatchTimeSeconds || 0)}</h3>
          <p className="text-[11px] text-neutral-500 mt-2">Duração total: {formatSecs(project.durationSeconds || 180)}</p>
        </div>
      </div>

      {/* FUNIL DE ETAPAS DO VÍDEO (LARGURA TOTAL) */}
      <div className="w-full p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Funil de Retenção por Marcos do Vídeo
            </h3>
            <span className="text-xs text-neutral-400 font-mono">VSL ID: {project.id}</span>
          </div>
          <p className="text-xs text-neutral-400 mb-6">
            Porcentagem de espectadores que alcançaram cada marco real do vídeo.
          </p>

          <div className="space-y-4">
            {milestones.map((m) => (
              <div key={m.pct} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-200">{m.label}</span>
                  <span className="text-neutral-100 font-mono">{m.retention}% dos leads</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${m.color}`}
                    style={{ width: `${m.retention}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
            <ShieldCheck className="w-4 h-4" /> Tracking de eventos timeupdate ativo
          </span>
          <span>{plays} reproduções registradas</span>
        </div>
      </div>
    </div>
  );
};
