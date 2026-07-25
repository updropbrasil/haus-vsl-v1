import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  AlertTriangle,
  Flame,
  Users,
  Target,
  Clock,
  Sparkles,
  TrendingDown,
  Info,
  ChevronRight
} from 'lucide-react';
import { VslProject, RetentionDataPoint } from '../types';

interface RetentionChartProps {
  project: VslProject;
}

export const RetentionChart: React.FC<RetentionChartProps> = ({ project }) => {
  const [metricType, setMetricType] = useState<'percentage' | 'viewers'>('percentage');

  const pitchSecond = project?.pitchConfig?.pitchTimeSeconds ?? 60;
  const pitchFormatted = `${Math.floor(pitchSecond / 60)
    .toString()
    .padStart(2, '0')}:${(pitchSecond % 60).toString().padStart(2, '0')}`;

  // Fallback to real zero curve if retentionData is empty or video is brand new
  const duration = project.durationSeconds || 180;
  const chartData = (project.retentionData && project.retentionData.length > 0)
    ? project.retentionData
    : Array.from({ length: 11 }, (_, i) => {
        const sec = Math.round((i / 10) * duration);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return {
          second: sec,
          timeFormatted: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
          percentage: i * 10,
          viewers: project.plays || 0,
          retentionRate: project.plays > 0 ? 100 : 0,
          dropoffRate: 0,
          segmentName: i < 2 ? 'Hook' : i < 7 ? 'História' : 'Pitch',
        };
      });

  // Find the point with highest drop-off rate (fuga de leads)
  let maxDropoffPoint: RetentionDataPoint | null = null;
  let maxDropoffVal = 0;

  if (project.plays > 0) {
    chartData.forEach((pt) => {
      if (pt.dropoffRate > maxDropoffVal && pt.second > 10) {
        maxDropoffVal = pt.dropoffRate;
        maxDropoffPoint = pt;
      }
    });
  }

  // Calculate retention percentage at pitch point
  const pitchDataPoint = chartData.find((pt) => pt.second >= pitchSecond) || chartData[0];
  const retentionAtPitch = pitchDataPoint ? pitchDataPoint.retentionRate : 0;

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: RetentionDataPoint = payload[0].payload;
      const isPitchPoint = Math.abs(data.second - pitchSecond) < 15;
      const isMajorDrop = maxDropoffPoint && data.second === maxDropoffPoint.second;

      return (
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl text-neutral-100 text-xs max-w-xs animate-fade-in z-50">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <span className="font-mono font-bold text-indigo-400 text-sm">{data.timeFormatted}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium">
              {data.percentage}% do vídeo
            </span>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Retenção de Audiência:</span>
              <span className="text-indigo-400 font-bold text-sm">{data.retentionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Visualizadores Ativos:</span>
              <span className="text-neutral-200 font-semibold">{data.viewers.toLocaleString('pt-BR')} leads</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Taxa de Fuga no Ponto:</span>
              <span className={`font-semibold ${data.dropoffRate > 5 ? 'text-rose-400' : 'text-neutral-300'}`}>
                -{data.dropoffRate}%
              </span>
            </div>
            {data.segmentName && (
              <div className="mt-2 pt-1.5 border-t border-neutral-800 text-[11px] text-indigo-300 font-medium flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-indigo-400" />
                <span>{data.segmentName}</span>
              </div>
            )}
          </div>

          {isPitchPoint && (
            <div className="mt-2 p-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>Momento da Oferta (Pitch Unlock)</span>
            </div>
          )}

          {isMajorDrop && (
            <div className="mt-2 p-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Maior Ponto de Fuga do Vídeo</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header do Gráfico de Retenção */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <TrendingDown className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Gráfico de Retenção de Audiência</h2>
            </div>
            <p className="text-xs text-neutral-400">
              Curva em tempo real mostrando a retenção de espectadores e os pontos exatos de queda de leads.
            </p>
          </div>

          {/* Toggle de Métricas (Porcentagem vs Leads Absolutos) */}
          <div className="flex items-center p-1 rounded-lg bg-neutral-950 border border-neutral-800 self-start md:self-auto">
            <button
              onClick={() => setMetricType('percentage')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                metricType === 'percentage'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Retenção (%)
            </button>
            <button
              onClick={() => setMetricType('viewers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                metricType === 'viewers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Leads Ativos
            </button>
          </div>
        </div>

        {/* Destaques Rápidos de Retenção */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 font-medium">Retenção no Pitch ({pitchFormatted})</p>
              <p className="text-lg font-bold text-indigo-400">{retentionAtPitch}% dos leads</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 font-medium">Ponto de Maior Fuga</p>
              <p className="text-lg font-bold text-rose-400">
                {maxDropoffPoint ? maxDropoffPoint.timeFormatted : '00:00'}{' '}
                <span className="text-xs font-normal text-neutral-400">(-{maxDropoffVal}%)</span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 font-medium">Gatilho de Pitch Ativo</p>
              <p className="text-lg font-bold text-amber-400">{pitchFormatted}</p>
            </div>
          </div>
        </div>

        {/* GRÁFICO RECHARTS AREA / LINE CHART */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
              <XAxis
                dataKey="timeFormatted"
                stroke="#525252"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#525252"
                domain={[0, 100]}
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickFormatter={(val) => (metricType === 'percentage' ? `${val}%` : val)}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Linha de Referência Marcando o Ponto de Pitch */}
              <ReferenceLine
                x={pitchFormatted}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `🔥 Pitch (${pitchFormatted})`,
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 'bold',
                  position: 'top',
                }}
              />

              {/* Área de Destaque da Maior Fuga */}
              {maxDropoffPoint && (
                <ReferenceLine
                  x={(maxDropoffPoint as RetentionDataPoint).timeFormatted}
                  stroke="#f43f5e"
                  strokeDasharray="2 2"
                  strokeWidth={2}
                  label={{
                    value: `⚠️ Maior Fuga (-${maxDropoffVal}%)`,
                    fill: '#f43f5e',
                    fontSize: 10,
                    fontWeight: 'bold',
                    position: 'insideTopLeft',
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey={metricType === 'percentage' ? 'retentionRate' : 'viewers'}
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRetention)"
                activeDot={{ r: 6, fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda e Explicação dos Marcadores */}
        <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> Curva de Retenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Momento do Pitch de Vendas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Fuga de Leads Detectada
            </span>
          </div>

          <span className="text-[11px] text-neutral-500">
            Atualizado automaticamente com base nas sessões gravadas
          </span>
        </div>
      </div>
    </div>
  );
};
