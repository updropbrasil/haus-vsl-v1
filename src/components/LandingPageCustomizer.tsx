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
} from 'lucide-react';
import { VslProject, LandingPageConfig } from '../types';

interface LandingPageCustomizerProps {
  project: VslProject;
  onSaveConfig: (newConfig: LandingPageConfig) => void;
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
  onPreviewLandingPage,
}) => {
  const defaultConfig: LandingPageConfig = {
    slug: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    headline: 'OPORTUNIDADE IMOBILIÁRIA: Assista à Apresentação Exclusiva do Imóvel Abaixo',
    subheadline: 'Descubra a localização优先级, fotos exclusivas e condições facilitadas de aquisição.',
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
      setSubheadline(project.landingPageConfig.subheadline || '');
      setBgImageUrl(project.landingPageConfig.bgImageUrl || '');
      setBgOverlayOpacity(project.landingPageConfig.bgOverlayOpacity ?? 0.85);
      setFooterText(project.landingPageConfig.footerText || '');
      setShowSecurityBadges(project.landingPageConfig.showSecurityBadges ?? true);
      if (project.landingPageConfig.customBadges) {
        setCustomBadges(project.landingPageConfig.customBadges);
      }
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
                Prévia ao Vivo
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">100% Responsivo</span>
            </div>

            {/* MOCKUP CONTAINER DE PÁGINA */}
            <div
              className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 min-h-[420px] flex flex-col justify-between p-4 text-center bg-cover bg-center transition-all"
              style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none' }}
            >
              {/* Overlay dark */}
              <div
                className="absolute inset-0 bg-neutral-950 transition-opacity"
                style={{ opacity: bgOverlayOpacity }}
              />

              <div className="relative z-10 space-y-2 pt-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold uppercase tracking-wider">
                  Exclusivo
                </span>
                <h4 className="text-xs font-black text-white leading-tight line-clamp-2">
                  {headline || 'Headline da VSL'}
                </h4>
                {subheadline && (
                  <p className="text-[10px] text-neutral-300 line-clamp-2">{subheadline}</p>
                )}
              </div>

              {/* Player Mock */}
              <div className="relative z-10 my-4 aspect-video rounded-md bg-neutral-900/90 border border-neutral-800 flex flex-col items-center justify-center p-3 text-neutral-400">
                <div className="w-10 h-10 rounded-full bg-indigo-600/90 flex items-center justify-center text-white mb-1 shadow-lg">
                  ▶
                </div>
                <span className="text-[10px] font-mono text-neutral-300">Player VSL Integrado</span>
              </div>

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
