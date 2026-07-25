import React, { useState } from 'react';
import {
  Activity,
  Filter,
  Play,
  Pause,
  Clock,
  Target,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { VslProject, VslEvent } from '../types';

interface EventLogTableProps {
  project: VslProject;
  onClearEvents?: () => void;
}

export const EventLogTable: React.FC<EventLogTableProps> = ({ project, onClearEvents }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const events = project.events || [];

  const filteredEvents = events.filter((evt) => {
    if (filterType !== 'all' && evt.eventType !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        evt.eventType.toLowerCase().includes(term) ||
        evt.device?.toLowerCase().includes(term) ||
        evt.timestampSeconds.toString().includes(term)
      );
    }
    return true;
  });

  const getEventBadge = (type: VslEvent['eventType']) => {
    switch (type) {
      case 'play':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[11px] flex items-center gap-1"><Play className="w-3 h-3 fill-indigo-400" /> Play Inicial</span>;
      case 'pause':
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[11px] flex items-center gap-1"><Pause className="w-3 h-3" /> Pausa / Abandono</span>;
      case 'milestone_10':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[11px]">Marco 10% (Hook OK)</span>;
      case 'milestone_25':
        return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[11px]">Marco 25%</span>;
      case 'milestone_50':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[11px]">Marco 50%</span>;
      case 'milestone_75':
        return <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[11px]">Marco 75%</span>;
      case 'milestone_100':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[11px]">Marco 100% (Concluído)</span>;
      case 'pitch_reached':
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1"><Target className="w-3 h-3" /> Pitch Atingido</span>;
      case 'cta_clicked':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 font-bold text-[11px] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Clique no Checkout CTA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-bold text-[11px]">{type}</span>;
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm">
      {/* Header do Log de Eventos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Logs de Eventos timeupdate (Real-time)</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Audit de eventos disparados no HTML5 video player em tempo real para simulação de banco de dados.
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Eventos</option>
            <option value="play">Plays</option>
            <option value="pause">Pausas / Abandonos</option>
            <option value="pitch_reached">Pitch Desbloqueado</option>
            <option value="cta_clicked">Cliques no CTA</option>
          </select>
        </div>
      </div>

      {/* Tabela de Eventos */}
      {filteredEvents.length === 0 ? (
        <div className="p-10 rounded-lg bg-neutral-950 border border-neutral-800 text-center text-neutral-400 text-xs">
          <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="font-semibold text-neutral-300">Nenhum evento registrado ainda para este vídeo.</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Dê play no vídeo no painel principal para gerar interações e marcos em tempo real!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Segundo Exato</th>
                <th className="px-4 py-3">Porcentagem</th>
                <th className="px-4 py-3">Dispositivo</th>
                <th className="px-4 py-3">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-medium">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3">{getEventBadge(evt.eventType)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{formatSec(evt.timestampSeconds)}</td>
                  <td className="px-4 py-3 font-mono text-indigo-400">{evt.percentage}%</td>
                  <td className="px-4 py-3 text-neutral-400">{evt.device || 'Desktop'}</td>
                  <td className="px-4 py-3 text-neutral-500 text-[11px]">
                    {new Date(evt.createdAt).toLocaleTimeString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
