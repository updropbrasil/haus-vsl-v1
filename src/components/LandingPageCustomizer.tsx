import React, { useState, useEffect } from 'react';
import {
  Layout,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Globe,
  Sliders,
  Type,
  ExternalLink,
  Plus,
  Trash2,
  Building2,
  BadgeCheck,
  Upload,
  Copy,
  Check,
  Code,
  Share2,
  Clock,
  Flame,
} from 'lucide-react';
import { VslProject, LandingPageConfig, PitchConfig } from '../types';

interface LandingPageCustomizerProps {
  project: VslProject;
  onSaveConfig: (newConfig: LandingPageConfig) => void;
  onSavePitchConfig?: (newPitchConfig: PitchConfig) => void;
  onPreviewLandingPage: () => void;
}

const PRESET_BACKGROUNDS = [
  {
    name: 'Mansão de Alto Padrão',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
  },
  {
    name: 'Arquitetura Moderna',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80',
  },
  {
    name: 'Condomínio de Luxo',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=80',
  },
  {
    name: 'Design e Acabamento Premium',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80',
  },
];

const PRESET_REAL_ESTATE_BADGES = [
  'CRECI Verificado • Imóvel Auditado',
  'Financiamento Caixa / Bancos Aprovado',
  'Atendimento Exclusivo Corretor',
  'Escritura & Documentação 100% Ok',
  'Programa Minha Casa Minha Vida',
  'Aceita Permuta / Veículo',
  'Pronto para Morar',
  'Lançamento na Planta com Desconto',
  'Condomínio Fechado com Lazer',
  'Simulação de Financiamento Grátis',
];

export const LandingPageCustomizer: React.FC<LandingPageCustomizerProps> = ({
  project,
  onSaveConfig,
  onSavePitchConfig,
  onPreviewLandingPage,
}) => {
  const defaultConfig: LandingPageConfig = {
    slug: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    headline: 'OPORTUNIDADE IMOBILIÁRIA: Assista à Apresentação Exclusiva do Imóvel Abaixo',
    subheadline: 'Descubra a localização exclusiva, fotos e condições facilitadas de aquisição.',
    bgImageUrl: PRESET_BACKGROUNDS[0].url,
    bgOverlayOpacity: 0.88,
    primaryColor: '#4f46e5',
    headlineColor: '#ffffff',
    subheadlineColor: '#cbd5e1',
    headerBgColor: '#09090b',
    footerText: `© ${new Date().getFullYear()} ${project.title} • Imóveis & Consultoria. Todos os Direitos Reservados.`,
    showSecurityBadges: true,
    customBadges: [
      'CRECI Verificado • Imóvel Auditado',
      'Financiamento Caixa / Bancos Aprovado',
      'Atendimento Exclusivo Corretor',
      'Escritura & Documentação 100% Ok',
    ],
  };

  const currentPitch: PitchConfig = project.pitchConfig || {
    pitchTimeSeconds: 90,
    ctaText: 'QUERO GARANTIR MINHA VAGA COM DESCONTO',
    ctaSubtext: '⚡ Desconto exclusivo liberado pelo tempo do vídeo',
    ctaUrl: 'https://checkout.exemplo.com/vsl-oferta',
    ctaButtonColor: '#059669',
    pulseEffect: true,
    showCountdown: true,
  };

  const initial = project.landingPageConfig || defaultConfig;

  const [slug, setSlug] = useState(initial.slug);
  const [headline, setHeadline] = useState(initial.headline);
  const [headlineColor, setHeadlineColor] = useState(initial.headlineColor || '#ffffff');
  const [subheadline, setSubheadline] = useState(initial.subheadline || '');
  const [subheadlineColor, setSubheadlineColor] = useState(initial.subheadlineColor || '#cbd5e1');
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor || '#4f46e5');
  const [headerBgColor, setHeaderBgColor] = useState(initial.headerBgColor || '#09090b');
  const [bgImageUrl, setBgImageUrl] = useState(initial.bgImageUrl || '');
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(initial.bgOverlayOpacity ?? 0.85);
  const [footerText, setFooterText] = useState(initial.footerText || '');
  const [showSecurityBadges, setShowSecurityBadges] = useState(initial.showSecurityBadges ?? true);
  const [customBadges, setCustomBadges] = useState<string[]>(
    initial.customBadges && initial.customBadges.length > 0
      ? initial.customBadges
      : [
          'CRECI Verificado • Imóvel Auditado',
          'Financiamento Caixa / Bancos Aprovado',
          'Atendimento Exclusivo Corretor',
          'Escritura & Documentação 100% Ok',
        ]
  );

  // Pitch Config State
  const [pitchMinutes, setPitchMinutes] = useState(Math.floor(currentPitch.pitchTimeSeconds / 60));
  const [pitchSeconds, setPitchSeconds] = useState(currentPitch.pitchTimeSeconds % 60);
  const [ctaText, setCtaText] = useState(currentPitch.ctaText);
  const [ctaSubtext, setCtaSubtext] = useState(currentPitch.ctaSubtext || '');
  const [ctaUrl, setCtaUrl] = useState(currentPitch.ctaUrl);
  const [ctaButtonColor, setCtaButtonColor] = useState(currentPitch.ctaButtonColor || '#059669');
  const [pulseEffect, setPulseEffect] = useState(currentPitch.pulseEffect);
  const [showCountdown, setShowCountdown] = useState(currentPitch.showCountdown);

  const [customDomain, setCustomDomain] = useState('https://vsl.hauscrm.com.br');
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);
  const [newBadgeText, setNewBadgeText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const cleanDomain = customDomain.replace(/\/$/, '') || 'https://vsl.hauscrm.com.br';
  const fullVslUrl = `${cleanDomain}/vsl/${slug || project.id}`;
  const iframeEmbedCode = `<iframe src="${fullVslUrl}" width="100%" height="650" frameborder="0" allowfullscreen></iframe>`;
  const jsEmbedCode = `<div id="vsl-player-${project.id}"></div>\n<script src="${cleanDomain}/embed.js" data-vsl-id="${project.id}" data-domain="${cleanDomain}"></script>`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkType(type);
    setTimeout(() => setCopiedLinkType(null), 2500);
  };

  useEffect(() => {
    if (project.landingPageConfig) {
      setSlug(project.landingPageConfig.slug);
      setHeadline(project.landingPageConfig.headline);
      setHeadlineColor(project.landingPageConfig.headlineColor || '#ffffff');
      setSubheadline(project.landingPageConfig.subheadline || '');
      setSubheadlineColor(project.landingPageConfig.subheadlineColor || '#cbd5e1');
      setPrimaryColor(project.landingPageConfig.primaryColor || '#4f46e5');
      setHeaderBgColor(project.landingPageConfig.headerBgColor || '#09090b');
      setBgImageUrl(project.landingPageConfig.bgImageUrl || '');
      setBgOverlayOpacity(project.landingPageConfig.bgOverlayOpacity ?? 0.85);
      setFooterText(project.landingPageConfig.footerText || '');
      setShowSecurityBadges(project.landingPageConfig.showSecurityBadges ?? true);
      if (project.landingPageConfig.customBadges) {
        setCustomBadges(project.landingPageConfig.customBadges);
      }
    }
    if (project.pitchConfig) {
      setPitchMinutes(Math.floor(project.pitchConfig.pitchTimeSeconds / 60));
      setPitchSeconds(project.pitchConfig.pitchTimeSeconds % 60);
      setCtaText(project.pitchConfig.ctaText);
      setCtaSubtext(project.pitchConfig.ctaSubtext || '');
      setCtaUrl(project.pitchConfig.ctaUrl);
      setCtaButtonColor(project.pitchConfig.ctaButtonColor || '#059669');
      setPulseEffect(project.pitchConfig.pulseEffect);
      setShowCountdown(project.pitchConfig.showCountdown);
    }
  }, [project]);

  const toggleBadge = (badge: string) => {
    if (customBadges.includes(badge)) {
      setCustomBadges(customBadges.filter((b) => b !== badge));
    } else {
      setCustomBadges([...customBadges, badge]);
    }
  };

  const handleAddCustomBadge = () => {
    const trimmed = newBadgeText.trim();
    if (trimmed && !customBadges.includes(trimmed)) {
      setCustomBadges([...customBadges, trimmed]);
      setNewBadgeText('');
    }
  };

  const handleRemoveBadge = (badgeToRemove: string) => {
    setCustomBadges(customBadges.filter((b) => b !== badgeToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LandingPageConfig = {
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      headline,
      headlineColor,
      subheadline,
      subheadlineColor,
      primaryColor,
      headerBgColor,
      bgImageUrl,
      bgOverlayOpacity,
      footerText,
      showSecurityBadges,
      customBadges,
    };
    onSaveConfig(updated);

    if (onSavePitchConfig) {
      const totalSeconds = pitchMinutes * 60 + pitchSeconds;
      onSavePitchConfig({
        pitchTimeSeconds: totalSeconds,
        ctaText,
        ctaSubtext,
        ctaUrl,
        ctaButtonColor,
        pulseEffect,
        showCountdown,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Banner de Topo */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Layout className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Customizador da Landing Page VSL</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                PAGE BUILDER
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Personalize o título, a foto de fundo com opacidade sutil e a URL pública para esta VSL específica.
            </p>
          </div>
        </div>

        <button
          onClick={onPreviewLandingPage}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Eye className="w-4 h-4" />
          <span>Visualizar Landing Page</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: CAMPOS DE CONFIGURAÇÃO (COL 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SLUG, DOMÍNIO & LINKS DE COMPARTILHAMENTO PRONTOS */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Link Oficial & Opções de Embed (https://vsl.hauscrm.com.br)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                DOMÍNIO PRÓPRIO ATIVO
              </span>
            </div>

            {/* Configuração de Domínio e Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block text-xs text-neutral-300 font-semibold mb-1">
                  Domínio / URL Base
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  placeholder="https://vsl.hauscrm.com.br"
                />
              </div>

              <div className="sm:col-span-7">
                <label className="block text-xs text-neutral-300 font-semibold mb-1">
                  Slug / Rota da VSL
                </label>
                <div className="flex items-center rounded-lg bg-neutral-950 border border-neutral-800 focus-within:border-indigo-500 overflow-hidden text-xs">
                  <span className="px-2.5 text-neutral-500 font-mono select-none border-r border-neutral-800 bg-neutral-900 py-2">
                    /vsl/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-transparent px-3 py-2 text-white font-mono font-semibold focus:outline-none"
                    placeholder="oferta-suplemento-vsl"
                  />
                </div>
              </div>
            </div>

            {/* BOX COM URL FINAL PRONTA PARA COPIAR */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-bold flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" /> URL Final da Landing Page:
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  Pronto para uso
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs text-indigo-300 select-all break-all flex items-center justify-between gap-2">
                <span>{fullVslUrl}</span>
                <a
                  href={fullVslUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                  title="Abrir URL em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* BOTÕES DE CÓPIA RÁPIDA DE LINK E EMBED */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(fullVslUrl, 'url')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    copiedLinkType === 'url'
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50'
                  }`}
                >
                  {copiedLinkType === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLinkType === 'url' ? 'URL Copiada!' : 'Copiar Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(iframeEmbedCode, 'iframe')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    copiedLinkType === 'iframe'
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                  }`}
                >
                  {copiedLinkType === 'iframe' ? <Check className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedLinkType === 'iframe' ? 'iFrame Copiado!' : 'Copiar iFrame'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(jsEmbedCode, 'script')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    copiedLinkType === 'script'
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                  }`}
                >
                  {copiedLinkType === 'script' ? <Check className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedLinkType === 'script' ? 'Script Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* HEADLINE & SUBHEADLINE */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center gap-2 text-sm font-bold text-white">
              <Type className="w-4 h-4 text-indigo-400" />
              <span>Textos de Chamada (Headline)</span>
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-semibold mb-1">
                Headline Principal (Título Acima do Vídeo)
              </label>
              <textarea
                rows={2}
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg p-3 text-white font-bold text-sm focus:outline-none"
                placeholder="Ex: ATENÇÃO: Assista ao Vídeo Antes Que Seja Removido"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-semibold mb-1">
                Subheadline (Subtítulo Complementar)
              </label>
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none"
                placeholder="Ex: Descubra o método comprovado para acelerar suas vendas."
              />
            </div>
          </div>

          {/* CONFIGURAÇÃO DO PITCH DE VENDAS & BOTÃO CTA */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Configuração do Pitch de Vendas & Botão CTA</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                DESBLOQUEIO AUTOMÁTICO
              </span>
            </div>

            {/* Tempo do Pitch */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <label className="block text-neutral-200 font-bold flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-amber-400" />
                Tempo de Desbloqueio do Pitch ({pitchMinutes.toString().padStart(2, '0')}:{pitchSeconds.toString().padStart(2, '0')})
              </label>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                O botão de compra/oferta abaixo do vídeo será exibido automaticamente quando o usuário assistir a {pitchMinutes * 60 + pitchSeconds} segundos.
              </p>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] text-neutral-400 font-semibold block mb-1">Minutos</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={pitchMinutes}
                    onChange={(e) => setPitchMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm text-center focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <span className="text-xl font-bold text-neutral-600 mt-4">:</span>
                <div className="flex-1">
                  <span className="text-[10px] text-neutral-400 font-semibold block mb-1">Segundos</span>
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

            {/* Texto do CTA */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-200 font-bold mb-1">Texto Principal do Botão CTA</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-white font-bold text-xs focus:border-indigo-500 focus:outline-none"
                  placeholder="QUERO GARANTIR MINHA VAGA COM DESCONTO"
                />
              </div>

              <div>
                <label className="block text-neutral-200 font-bold mb-1">Subtexto do Botão (Urgência / Garantia)</label>
                <input
                  type="text"
                  value={ctaSubtext}
                  onChange={(e) => setCtaSubtext(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  placeholder="⚡ Desconto exclusivo liberado pelo tempo do vídeo"
                />
              </div>

              <div>
                <label className="block text-neutral-200 font-bold mb-1">URL de Destino / Link de Checkout</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-indigo-400 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  placeholder="https://checkout.exemplo.com/vsl-oferta"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-neutral-200 font-bold mb-1">Cor do Botão CTA</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ctaButtonColor}
                      onChange={(e) => setCtaButtonColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={ctaButtonColor}
                      onChange={(e) => setCtaButtonColor(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-neutral-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pulseEffect}
                      onChange={(e) => setPulseEffect(e.target.checked)}
                      className="rounded bg-neutral-950 border-neutral-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Efeito de Pulsar no Botão</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMIZAÇÃO DE CORES DE TEXTO E PALETA DO HEADER */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Customização de Cores dos Textos e Cabeçalho</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">Real-time Styling</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Cor da Headline (Título)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={headlineColor}
                    onChange={(e) => setHeadlineColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-neutral-700 bg-neutral-950 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={headlineColor}
                    onChange={(e) => setHeadlineColor(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Cor da Subheadline (Subtítulo)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subheadlineColor}
                    onChange={(e) => setSubheadlineColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-neutral-700 bg-neutral-950 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={subheadlineColor}
                    onChange={(e) => setSubheadlineColor(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Cor de Destaque / Botões / Ícones
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-neutral-700 bg-neutral-950 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Cor de Fundo do Cabeçalho Superior
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={headerBgColor}
                    onChange={(e) => setHeaderBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-neutral-700 bg-neutral-950 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={headerBgColor}
                    onChange={(e) => setHeaderBgColor(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Presets de Paleta de Cores Rápidas */}
            <div className="pt-2">
              <span className="text-[11px] text-neutral-400 font-semibold block mb-1.5">
                Paletas Prontas de Alta Conversão:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Ouro e Preto (Luxo Imobiliário)', headline: '#ffffff', sub: '#fef3c7', primary: '#d97706', bg: '#09090b' },
                  { label: 'Esmeralda Alta Conversão', headline: '#ffffff', sub: '#a7f3d0', primary: '#059669', bg: '#064e3b' },
                  { label: 'Azul Corporativo Premium', headline: '#ffffff', sub: '#bae6fd', primary: '#0284c7', bg: '#0f172a' },
                  { label: 'Branco & Cinza Minimalista', headline: '#ffffff', sub: '#94a3b8', primary: '#6366f1', bg: '#09090b' },
                ].map((palette) => (
                  <button
                    key={palette.label}
                    type="button"
                    onClick={() => {
                      setHeadlineColor(palette.headline);
                      setSubheadlineColor(palette.sub);
                      setPrimaryColor(palette.primary);
                      setHeaderBgColor(palette.bg);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500 text-neutral-300 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: palette.primary }} />
                    <span>{palette.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FOTO DE FUNDO & OPACIDADE */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Foto de Fundo Sutil & Opacidade</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Upload Direto
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-neutral-300 font-semibold mb-1">
                Upar Imagem de Fundo do Computador (JPG, PNG, WebP)
              </label>

              {/* Botão de Upload Direto de Imagem */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-indigo-500">
                  <Upload className="w-4 h-4" />
                  <span>Escolher Foto do Computador</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setBgImageUrl(evt.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {bgImageUrl && (
                  <button
                    type="button"
                    onClick={() => setBgImageUrl('')}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400 text-xs font-medium transition-all cursor-pointer"
                  >
                    Remover Foto
                  </button>
                )}
              </div>

              {/* URL Manual Fallback (Opcional) */}
              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1">
                  Ou cole o Link / URL da Imagem (Opcional):
                </label>
                <input
                  type="url"
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                  placeholder="https://pub-vsl-optima.r2.dev/imagens/fundo.jpg"
                />
              </div>
            </div>

            {/* Presets Rápidos de Imagem de Fundo */}
            <div>
              <p className="text-[11px] text-neutral-400 mb-2 font-medium">Imagens de Fundo Recomendadas:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_BACKGROUNDS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setBgImageUrl(preset.url)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition-all cursor-pointer flex flex-col justify-between h-16 bg-cover bg-center relative overflow-hidden ${
                      bgImageUrl === preset.url
                        ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                    style={{ backgroundImage: `url(${preset.url})` }}
                  >
                    <div className="absolute inset-0 bg-neutral-950/70 hover:bg-neutral-950/50 transition-colors" />
                    <span className="relative z-10 text-white drop-shadow font-bold line-clamp-2">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opacidade do Fundo */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Escuridão do Fundo (Tint Dark)
                </span>
                <span className="font-mono text-indigo-400">{Math.round(bgOverlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.98"
                step="0.02"
                value={bgOverlayOpacity}
                onChange={(e) => setBgOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-neutral-950 cursor-pointer h-2 rounded-lg"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Valores mais altos (85-95%) garantem leitura perfeita dos textos e foco total no player de vídeo.
              </p>
            </div>
          </div>

          {/* RODAPÉ & SELOS DA OFERTA / EMPREENDIMENTO */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Selos & Garantias do Empreendimento</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-semibold mb-1">
                Texto de Direitos / Copyright no Rodapé
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none"
                placeholder="© 2026 Minha Empresa. Todos os direitos reservados."
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showSecurityBadges}
                onChange={(e) => setShowSecurityBadges(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
              <span className="font-semibold">Exibir Selos do Imóvel na Landing Page</span>
            </label>

            {showSecurityBadges && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 text-xs">
                <div>
                  <span className="font-bold text-neutral-200 block mb-2">
                    Escolha os Selos Rápidos Recomendados:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_REAL_ESTATE_BADGES.map((preset) => {
                      const isSelected = customBadges.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => toggleBadge(preset)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <BadgeCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-neutral-500'}`} />
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <span className="font-bold text-neutral-200 block mb-1.5">
                    Adicionar Selo Personalizado do Empreendimento:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBadgeText}
                      onChange={(e) => setNewBadgeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomBadge();
                        }
                      }}
                      placeholder="Ex: Próximo ao Metrô, Entrada em 60x, Varanda Gourmet..."
                      className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomBadge}
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {customBadges.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800">
                    <span className="font-bold text-neutral-300 block mb-2">
                      Selos Ativos na Página ({customBadges.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {customBadges.map((badge) => (
                        <div
                          key={badge}
                          className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-emerald-300 font-medium flex items-center gap-2"
                        >
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{badge}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBadge(badge)}
                            className="text-neutral-500 hover:text-rose-400 transition-colors ml-1"
                            title="Remover selo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTÃO SALVAR */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {savedSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Configurações salvas e sincronizadas!</span>
              </div>
            )}

            <button
              type="submit"
              className="ml-auto px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Landing Page</span>
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO EM TEMPO REAL (COL 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Prévia ao Vivo em Tempo Real
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao Vivo
              </span>
            </div>

            {/* MOCKUP CONTAINER DE PÁGINA */}
            <div
              className="relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 min-h-[440px] flex flex-col justify-between p-4 text-center bg-cover bg-center transition-all shadow-xl"
              style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none' }}
            >
              {/* Top Header Bar Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1 z-20 transition-colors"
                style={{ backgroundColor: headerBgColor || primaryColor }}
              />

              {/* Overlay dark */}
              <div
                className="absolute inset-0 bg-neutral-950 transition-opacity"
                style={{ opacity: bgOverlayOpacity }}
              />

              <div className="relative z-10 space-y-2 pt-2">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border transition-colors"
                  style={{
                    backgroundColor: `${primaryColor}25`,
                    borderColor: `${primaryColor}50`,
                    color: primaryColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: primaryColor }} />
                  Apresentação Exclusiva
                </span>

                <h4
                  className="text-xs sm:text-sm font-black leading-tight line-clamp-2 transition-colors drop-shadow"
                  style={{ color: headlineColor || '#ffffff' }}
                >
                  {headline || 'Headline da VSL'}
                </h4>

                {subheadline && (
                  <p
                    className="text-[10px] font-medium line-clamp-2 transition-colors drop-shadow-sm"
                    style={{ color: subheadlineColor || '#cbd5e1' }}
                  >
                    {subheadline}
                  </p>
                )}
              </div>

              {/* Player com Vídeo Ativo Rodando Silencioso em Tempo Real */}
              <div className="relative z-10 my-3 aspect-video rounded-lg bg-black border border-neutral-800 overflow-hidden shadow-2xl group flex items-center justify-center">
                {project.videoUrl ? (
                  <video
                    src={project.videoUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="auto"
                    onError={(e) => {
                      if (project.secondaryVideoUrl && e.currentTarget.src !== project.secondaryVideoUrl) {
                        e.currentTarget.src = project.secondaryVideoUrl;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 p-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white mb-1 shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      ▶
                    </div>
                    <span className="text-[10px] font-mono text-neutral-300">Player VSL</span>
                  </div>
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[8px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VÍDEO EM TEMPO REAL</span>
                </div>
              </div>

              {/* PRÉVIA DO BOTÃO CTA DO PITCH DESBLOQUEADO */}
              <div className="relative z-10 my-2 space-y-1">
                <div
                  style={{ backgroundColor: ctaButtonColor || primaryColor }}
                  className={`w-full py-2.5 px-3 rounded-lg text-white font-extrabold text-xs shadow-lg flex flex-col items-center justify-center gap-0.5 uppercase tracking-wide cursor-pointer transition-all ${
                    pulseEffect ? 'animate-pulse' : ''
                  }`}
                >
                  <span>{ctaText || 'QUERO GARANTIR MINHA VAGA'}</span>
                  {ctaSubtext && (
                    <span className="text-[9px] font-normal normal-case opacity-90 leading-tight">
                      {ctaSubtext}
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-amber-400 font-mono block">
                  ⚡ Desbloqueia automaticamente aos {pitchMinutes.toString().padStart(2, '0')}:
                  {pitchSeconds.toString().padStart(2, '0')} do vídeo
                </span>
              </div>

              {/* Selos em miniatura */}
              {showSecurityBadges && customBadges.length > 0 && (
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-1 my-1">
                  {customBadges.slice(0, 3).map((badge) => (
                    <span
                      key={badge}
                      className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 text-[8px] text-neutral-300 truncate max-w-[120px]"
                    >
                      ✓ {badge}
                    </span>
                  ))}
                  {customBadges.length > 3 && (
                    <span className="text-[8px] text-neutral-500">+{customBadges.length - 3}</span>
                  )}
                </div>
              )}

              {/* Footer Mock */}
              <div className="relative z-10 text-[9px] text-neutral-500 border-t border-neutral-800/80 pt-2">
                <p className="line-clamp-1">{footerText}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
