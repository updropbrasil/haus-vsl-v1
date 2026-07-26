import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VslProject, VslEvent, UserSession } from '../types';

const STORAGE_URL_KEY = 'vsl_supabase_url';
const STORAGE_KEY_KEY = 'vsl_supabase_anon_key';
const STORAGE_USER_KEY = 'vsl_local_user_session';

export interface SupabaseConfigState {
  url: string;
  key: string;
  isConnected: boolean;
  lastTestedAt?: string;
}

export const DEFAULT_SUPABASE_URL = 'https://iutydnttcmnzyeajmvuw.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHlkbnR0Y21uenllYWptdnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTk1MzcsImV4cCI6MjEwMDQ3NTUzN30.GaLSZkaKbWAubn7gkQXet9YpB5W51zu-OSj-sz3R8X8';

export function getSupabaseCredentials(): { url: string; key: string } {
  const url = localStorage.getItem(STORAGE_URL_KEY) || (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem(STORAGE_KEY_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
  cachedClient = null;

  // Salva no servidor para persistência automática em todas as sessões e deploys
  if (cleanUrl && cleanKey) {
    fetch('/api/settings/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, key: cleanKey }),
    }).catch(() => {});
  }
}

export async function hydrateSupabaseCredentials(): Promise<{ url: string; key: string }> {
  try {
    const res = await fetch('/api/settings/supabase');
    if (res.ok) {
      const data = await res.json();
      if (data?.config?.url && data?.config?.key) {
        const url = data.config.url.trim();
        const key = data.config.key.trim();
        localStorage.setItem(STORAGE_URL_KEY, url);
        localStorage.setItem(STORAGE_KEY_KEY, key);
        cachedClient = null; // Reseta o client cacheado para usar as credenciais atualizadas
        return { url, key };
      }
    }
  } catch {}

  const { url, key } = getSupabaseCredentials();
  return { url, key };
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar Supabase Client:', err);
    return null;
  }
}

export async function testSupabaseConnection(urlInput?: string, keyInput?: string): Promise<{ success: boolean; message: string }> {
  const { url, key } = urlInput && keyInput ? { url: urlInput, key: keyInput } : getSupabaseCredentials();

  if (!url || !key) {
    return {
      success: false,
      message: 'Insira a URL do projeto Supabase e a Anon API Key.',
    };
  }

  try {
    const tempClient = createClient(url, key);
    const { error } = await tempClient.from('vsl_projects').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.vsl_projects" does not exist')) {
      if (error.message.includes('apiKey') || error.message.includes('JWT') || error.message.includes('invalid')) {
        return { success: false, message: `Erro de Autenticação Supabase: ${error.message}` };
      }
    }

    return {
      success: true,
      message: 'Conexão efetuada com sucesso ao seu banco de dados Supabase!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro na conexão: ${err.message || 'Falha ao conectar'}`,
    };
  }
}

/**
 * Salva ou recupera a sessão do usuário no localStorage
 */
export function getLocalUserSession(): UserSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_USER_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function saveLocalUserSession(session: UserSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}

/**
 * Salva ou atualiza um projeto no Supabase
 */
export async function syncProjectToSupabase(project: VslProject): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('vsl_projects').upsert(
      {
        id: project.id,
        user_id: project.userId || null,
        title: project.title,
        description: project.description,
        video_url: project.videoUrl,
        thumbnail_url: project.thumbnailUrl || null,
        aspect_ratio: project.aspectRatio || '16:9',
        duration_seconds: project.durationSeconds,
        total_views: project.totalViews,
        plays: project.plays,
        completion_count: project.completionCount,
        avg_watch_time_seconds: project.avgWatchTimeSeconds,
        pitch_config: project.pitchConfig,
        landing_page_config: project.landingPageConfig || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Erro ao sincronizar VSL com Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na requisição Supabase:', err);
    return false;
  }
}

/**
 * Busca todos os projetos VSL diretamente do banco de dados Supabase
 */
export async function fetchProjectsFromSupabase(): Promise<VslProject[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('vsl_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar VSLs do Supabase:', error.message);
      return null;
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title || 'VSL Sem Título',
      description: row.description || '',
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url || '',
      aspectRatio: row.aspect_ratio || '16:9',
      durationSeconds: row.duration_seconds || 180,
      createdAt: row.created_at,
      totalViews: row.total_views || 0,
      plays: row.plays || 0,
      completionCount: row.completion_count || 0,
      avgWatchTimeSeconds: row.avg_watch_time_seconds || 0,
      pitchConfig: row.pitch_config || {
        pitchTimeSeconds: 60,
        ctaText: 'COMPRAR AGORA',
        ctaUrl: '#',
        ctaButtonColor: '#4f46e5',
        pulseEffect: true,
        showCountdown: true,
      },
      landingPageConfig: row.landing_page_config || undefined,
      retentionData: row.retention_data || Array.from({ length: 10 }, (_, i) => ({
        second: i * 15,
        timeFormatted: `${Math.floor((i * 15) / 60)}:${((i * 15) % 60).toString().padStart(2, '0')}`,
        percentage: i * 10,
        viewers: 100 - i * 5,
        retentionRate: 100 - i * 5,
        dropoffRate: 5,
      })),
      events: [],
    }));
  } catch (err) {
    console.warn('Falha na requisição ao buscar projetos no Supabase:', err);
    return null;
  }
}

/**
 * Remove um projeto do Supabase
 */
export async function deleteProjectFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('vsl_projects').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao excluir VSL no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha ao excluir VSL no Supabase:', err);
    return false;
  }
}

/**
 * Registra evento no Supabase em tempo real
 */
export async function sendEventToSupabase(event: VslEvent): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('vsl_events').insert({
      id: event.id,
      vsl_id: event.vslId,
      event_type: event.eventType,
      timestamp_seconds: event.timestampSeconds,
      percentage: event.percentage,
      device: event.device || 'Desktop',
      created_at: event.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.warn('Erro ao inserir evento no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao conectar ao Supabase para eventos:', err);
    return false;
  }
}

/**
 * Salva as credenciais do Cloudflare R2 no banco de dados Supabase
 */
export async function saveR2ConfigToSupabase(r2Config: any): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('vsl_settings').upsert(
      {
        id: 'default',
        r2_config: r2Config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Aviso: Não foi possível gravar R2 Config no Supabase (verifique se a tabela vsl_settings existe):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha ao conectar com Supabase para salvar R2:', err);
    return false;
  }
}

/**
 * Busca as credenciais salvas do Cloudflare R2 diretamente do Supabase
 */
export async function fetchR2ConfigFromSupabase(): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('vsl_settings')
      .select('r2_config')
      .eq('id', 'default')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Aviso ao buscar R2 Config no Supabase:', error.message);
      return null;
    }

    if (data?.r2_config && typeof data.r2_config === 'object' && Object.keys(data.r2_config).length > 0) {
      return data.r2_config;
    }
    return null;
  } catch (err) {
    console.warn('Falha ao consultar R2 Config no Supabase:', err);
    return null;
  }
}

/**
 * Retorna o script SQL completo para ser executado no Supabase SQL Editor
 */
export function generateSupabaseSqlScript(): string {
  return `-- ============================================================
-- SCRIPT SQL COMPLETO PARA MULTI-TENANT SAAS (VSL OPTIMA ANALYTICS)
-- Execute no SQL Editor do seu Supabase para habilitar contas, tabelas e R2
-- ============================================================

-- 1. Criação da Tabela de Projetos VSL (vsl_projects)
CREATE TABLE IF NOT EXISTS public.vsl_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9',
  duration_seconds INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  avg_watch_time_seconds NUMERIC DEFAULT 0,
  pitch_config JSONB DEFAULT '{}'::jsonb,
  landing_page_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criação da Tabela de Logs de Eventos de Tempo Real (vsl_events)
CREATE TABLE IF NOT EXISTS public.vsl_events (
  id TEXT PRIMARY KEY,
  vsl_id TEXT NOT NULL REFERENCES public.vsl_projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp_seconds NUMERIC DEFAULT 0,
  percentage INTEGER DEFAULT 0,
  device TEXT DEFAULT 'Desktop',
  user_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Configurações do App e Credenciais Cloudflare R2 (vsl_settings)
CREATE TABLE IF NOT EXISTS public.vsl_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  r2_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_vsl_projects_user_id ON public.vsl_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_vsl_events_vsl_id ON public.vsl_events(vsl_id);
CREATE INDEX IF NOT EXISTS idx_vsl_events_type ON public.vsl_events(event_type);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.vsl_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vsl_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vsl_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Acesso publico para leitura de VSL e landing page" ON public.vsl_projects;
CREATE POLICY "Acesso publico para leitura de VSL e landing page"
  ON public.vsl_projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Proprietarios gerenciam seus proprios VSLs" ON public.vsl_projects;
CREATE POLICY "Proprietarios gerenciam seus proprios VSLs"
  ON public.vsl_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir insercao publica de eventos do player" ON public.vsl_events;
CREATE POLICY "Permitir insercao publica de eventos do player"
  ON public.vsl_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gerenciar configuracoes vsl_settings" ON public.vsl_settings;
CREATE POLICY "Permitir gerenciar configuracoes vsl_settings"
  ON public.vsl_settings FOR ALL USING (true) WITH CHECK (true);

-- 6. View de Resumo do Dashboard Multi-tenant
CREATE OR REPLACE VIEW public.vsl_analytics_summary AS
SELECT
  p.id AS vsl_id,
  p.user_id,
  p.title,
  p.aspect_ratio,
  p.total_views,
  p.plays,
  COUNT(CASE WHEN e.event_type = 'cta_clicked' THEN 1 END) AS total_cta_clicks,
  COUNT(CASE WHEN e.event_type = 'milestone_10' THEN 1 END) AS reached_hook_10pct,
  COUNT(CASE WHEN e.event_type = 'pitch_reached' THEN 1 END) AS reached_pitch
FROM public.vsl_projects p
LEFT JOIN public.vsl_events e ON p.id = e.vsl_id
GROUP BY p.id, p.user_id, p.title, p.aspect_ratio, p.total_views, p.plays;
`;
}

