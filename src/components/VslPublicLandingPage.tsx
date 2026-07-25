import React from 'react';
import {
  ShieldCheck,
  Building2,
  Key,
  FileCheck,
  Landmark,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { VslProject, VslEvent } from '../types';
import { VslPlayer } from './VslPlayer';

interface VslPublicLandingPageProps {
  project: VslProject;
  onTrackEvent: (event: Omit<VslEvent, 'id' | 'createdAt'>) => void;
  onBackToDashboard?: () => void;
  isPreviewMode?: boolean;
}

export const VslPublicLandingPage: React.FC<VslPublicLandingPageProps> = ({
  project,
  onTrackEvent,
  onBackToDashboard,
  isPreviewMode = true,
}) => {
  const lpConfig = project.landingPageConfig || {
    slug: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    headline: 'OPORTUNIDADE IMOBILIÁRIA: Assista à Apresentação Exclusiva do Imóvel Abaixo',
    subheadline: 'Descubra a localização privilegiada, fotos exclusivas e condições facilitadas de aquisição.',
    bgImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
    bgOverlayOpacity: 0.88,
    footerText: `© ${new Date().getFullYear()} ${project.title} • Corretagem e Consultoria Imobiliária. Todos os Direitos Reservados.`,
    showSecurityBadges: true,
  };

  const bgImageStyle = lpConfig.bgImageUrl
    ? { backgroundImage: `url(${lpConfig.bgImageUrl})` }
    : {};

  const badgesToDisplay =
    lpConfig.customBadges && lpConfig.customBadges.length > 0
      ? lpConfig.customBadges
      : [
          'CRECI Verificado • Imóvel Auditado',
          'Financiamento Caixa / Bancos Aprovado',
          'Atendimento Exclusivo Corretor',
          'Escritura & Documentação 100% Ok',
        ];

  return (
    <div className="relative min-w-full min-h-screen bg-neutral-950 text-white flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      {/* Imagem de Fundo Customizável com Opacidade Sutil */}
      {lpConfig.bgImageUrl && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-500"
          style={{
            ...bgImageStyle,
            opacity: 1 - lpConfig.bgOverlayOpacity,
          }}
        />
      )}

      {/* Máscara Gradient Dark por Cima da Foto de Fundo */}
      <div className="fixed inset-0 bg-radial from-transparent via-neutral-950/80 to-neutral-950 pointer-events-none" />

      {/* Bar de Controle do Admin / Preview (se estiver dentro do painel) */}
      {isPreviewMode && (
        <div className="relative z-50 bg-neutral-900/90 border-b border-neutral-800 px-4 py-2.5 backdrop-blur-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> PREVIEW DA LANDING PAGE
            </span>
            <span className="hidden sm:inline text-neutral-400">
              Esta é a página final que seus clientes visualizarão no link: <code className="text-white font-mono bg-neutral-950 px-1.5 py-0.5 rounded">/vsl/{lpConfig.slug || project.id}</code>
            </span>
          </div>

          <button
            onClick={onBackToDashboard}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Dashboard</span>
          </button>
        </div>
      )}

      {/* CONTEÚDO DA LANDING PAGE */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col items-center justify-center space-y-6 sm:space-y-8">
        {/* HEADLINE & SUBHEADLINE */}
        <div className="text-center space-y-3 max-w-3xl animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 animate-pulse border shadow-sm"
            style={{
              backgroundColor: lpConfig.primaryColor ? `${lpConfig.primaryColor}25` : '#e11d4825',
              borderColor: lpConfig.primaryColor ? `${lpConfig.primaryColor}50` : '#e11d4850',
              color: lpConfig.primaryColor || '#fb7185',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: lpConfig.primaryColor || '#e11d48' }}
            />
            <span>Apresentação Exclusiva</span>
          </div>

          <h1
            className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-md"
            style={{ color: lpConfig.headlineColor || '#ffffff' }}
          >
            {lpConfig.headline}
          </h1>

          {lpConfig.subheadline && (
            <p
              className="text-sm sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed drop-shadow"
              style={{ color: lpConfig.subheadlineColor || '#cbd5e1' }}
            >
              {lpConfig.subheadline}
            </p>
          )}
        </div>

        {/* CONTAINER DO PLAYER VSL EM DESTAQUE CINEMA */}
        <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md p-2 sm:p-4 animate-scale-up">
          <VslPlayer
            project={project}
            onTrackEvent={onTrackEvent}
            isPublicView={true}
          />
        </div>

        {/* SELOS DO EMPREENDIMENTO / OFERTA (CUSTOMIZÁVEIS PELO ADMIN) */}
        {lpConfig.showSecurityBadges && badgesToDisplay.length > 0 && (
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-neutral-200 text-xs font-semibold">
            {badgesToDisplay.map((badgeText, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-sm backdrop-blur-sm hover:border-neutral-700 transition-all"
              >
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{badgeText}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RODAPÉ DA LANDING PAGE */}
      <footer className="relative z-10 w-full py-8 border-t border-neutral-900 bg-neutral-950/90 text-center text-xs text-neutral-500 space-y-3">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="text-neutral-400 font-medium">
            {lpConfig.footerText || `© ${new Date().getFullYear()} ${project.title}. Todos os Direitos Reservados.`}
          </p>

          {(lpConfig.termsUrl || lpConfig.privacyPolicyUrl) && (
            <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-500">
              {lpConfig.termsUrl && (
                <a href={lpConfig.termsUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-300 transition-colors">
                  Termos de Uso
                </a>
              )}
              {lpConfig.privacyPolicyUrl && (
                <a href={lpConfig.privacyPolicyUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-300 transition-colors">
                  Políticas de Privacidade
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
