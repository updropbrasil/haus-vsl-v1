import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ShieldCheck, Terminal, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  testSupabaseConnection,
  generateSupabaseSqlScript,
} from '../lib/supabase';

export const SupabaseConfig: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const sqlScript = generateSupabaseSqlScript();

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    if (creds.url && creds.key) {
      handleTestConnection(creds.url, creds.key);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, key);
    handleTestConnection(url, key);
  };

  const handleTestConnection = async (testUrl?: string, testKey?: string) => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(testUrl || url, testKey || key);
    setTestResult(result);
    setIsTesting(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/40 border border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Database className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Integração Nativa Supabase</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                PRO CONNECT
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Conecte o seu projeto do Supabase para armazenar retenção, plays, eventos do player e métricas de pitch em nuvem.
            </p>
          </div>
        </div>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors w-fit"
        >
          <span>Abrir Supabase Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FORMULARIO DE CREDENCIAIS (COL 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Credenciais do Projeto
              </h3>
              {testResult?.success && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  SUPABASE_URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzxyz.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Encontrado em Project Settings → API → Project URL
                </p>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  SUPABASE_ANON_KEY <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Encontrado em Project Settings → API → Project API Keys (anon public)
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span className="leading-snug">{testResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>Salvar & Testar Conexão</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* DICA DE FLUXO */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-2">
            <p className="font-bold text-neutral-200 flex items-center gap-1.5">
              💡 Como funciona a sincronização?
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Quando as credenciais estão salvas, todos os novos VSLs criados e interações no vídeo (Play, retenção de 10%, 25%, 50%, desbloqueio de pitch e cliques no botão de oferta) são enviados diretamente para as tabelas do seu Supabase.
            </p>
          </div>
        </div>

        {/* EXPORTADOR DE SQL SCHEMA (COL 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Script SQL do Banco de Dados</h3>
                  <p className="text-[11px] text-neutral-400">
                    Copie e cole este código no <strong>SQL Editor</strong> do seu Supabase para criar as tabelas automaticamente.
                  </p>
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            {/* CAIXA DE CÓDIGO SQL COM SINTAXE LIMPA */}
            <div className="relative rounded-lg bg-neutral-950 border border-neutral-800 p-4 font-mono text-[11px] text-neutral-300 max-h-[420px] overflow-y-auto leading-relaxed select-all">
              <pre className="whitespace-pre-wrap">{sqlScript}</pre>
            </div>

            {/* PASSOS PARA EXECUTAR */}
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 space-y-1.5">
              <p className="font-bold text-indigo-400">Passo a passo no Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                <li>Acesse o seu Dashboard no Supabase.</li>
                <li>No menu lateral esquerdo, clique no ícone <strong>SQL Editor</strong>.</li>
                <li>Clique em <strong>+ New Query</strong>.</li>
                <li>Cole o código SQL acima e clique em <strong>RUN</strong> (no canto inferior direito).</li>
                <li>Pronto! Suas tabelas <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">vsl_projects</code> e <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">vsl_events</code> serão criadas com políticas de segurança ativas.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
