import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { createServer as createViteServer } from 'vite';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit fallback
});

/**
 * Higieniza o Account ID do Cloudflare R2 para garantir que seja apenas
 * a hash hex de 32 caracteres (ex: 8e2cb656649243e49a2cdd3f4ca9d4c)
 * evitando URLs duplicadas que causam erro de SSL / Handshake Alert 40.
 */
function cleanAccountId(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  const hexMatch = cleaned.match(/([a-f0-9]{32})/i);
  if (hexMatch) {
    return hexMatch[1].toLowerCase();
  }
  return cleaned
    .replace(/^https?:\/\//i, '')
    .replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
    .replace(/\/.*$/, '')
    .trim();
}

function cleanBucketAndFolder(rawBucket: string, rawFolder?: string) {
  let bucket = (rawBucket || '').trim();
  let folder = (rawFolder || '').trim().replace(/^\/+|\/+$/g, '');

  if (bucket.includes('/')) {
    const parts = bucket.split('/').filter(Boolean);
    if (parts.length > 0) {
      bucket = parts[0];
      if (parts.length > 1 && !folder) {
        folder = parts.slice(1).join('/');
      }
    }
  }
  return { bucket, folder };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Middleware CORS para suportar requisições em qualquer ambiente (Preview, Deployed, Custom Domain, iframe)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Memória e Persistência de Configurações no Servidor Node.js
  let savedServerR2Config: any = null;
  const configPath = path.join(process.cwd(), '.r2-config.json');

  try {
    if (fs.existsSync(configPath)) {
      savedServerR2Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}

  let savedServerSupabaseConfig: any = null;
  const supabaseConfigPath = path.join(process.cwd(), '.supabase-config.json');

  try {
    if (fs.existsSync(supabaseConfigPath)) {
      savedServerSupabaseConfig = JSON.parse(fs.readFileSync(supabaseConfigPath, 'utf8'));
    }
  } catch (e) {}

  // Memória e Persistência de Projetos VSL no Servidor Node.js
  let savedServerProjects: any[] = [];
  const projectsPath = path.join(process.cwd(), '.vsl-projects.json');

  try {
    if (fs.existsSync(projectsPath)) {
      savedServerProjects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    }
  } catch (e) {}

  function persistProjectsToServer(projects: any[]) {
    try {
      savedServerProjects = projects;
      fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf8');
    } catch (e) {}
  }

  // API Route: Buscar Todos os Projetos do Servidor (Sincronização entre Navegadores/Sessões)
  app.get('/api/projects', (req, res) => {
    return res.json({
      success: true,
      projects: savedServerProjects,
    });
  });

  // API Route: Salvar/Atualizar Projetos no Servidor
  app.post('/api/projects', (req, res) => {
    try {
      const { projects, project } = req.body;
      if (Array.isArray(projects)) {
        persistProjectsToServer(projects);
        return res.json({ success: true, projects: savedServerProjects });
      } else if (project && project.id) {
        const index = savedServerProjects.findIndex((p: any) => p.id === project.id);
        if (index >= 0) {
          savedServerProjects[index] = { ...savedServerProjects[index], ...project };
        } else {
          savedServerProjects.unshift(project);
        }
        persistProjectsToServer(savedServerProjects);
        return res.json({ success: true, projects: savedServerProjects });
      }
      return res.status(400).json({ success: false, error: 'Dados de projeto inválidos.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Excluir Projeto no Servidor
  app.delete('/api/projects/:id', (req, res) => {
    try {
      const { id } = req.params;
      savedServerProjects = savedServerProjects.filter((p: any) => p.id !== id);
      persistProjectsToServer(savedServerProjects);
      return res.json({ success: true, projects: savedServerProjects });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Escanear o Bucket Cloudflare R2 e Sincronizar Todos os Vídeos Existentes
  app.all('/api/r2/sync-videos', async (req, res) => {
    try {
      const accountId = cleanAccountId(req.body?.accountId || req.query?.accountId as string || savedServerR2Config?.accountId || '');
      const accessKeyId = (req.body?.accessKeyId || req.query?.accessKeyId as string || savedServerR2Config?.accessKeyId || '')?.trim();
      const secretAccessKey = (req.body?.secretAccessKey || req.query?.secretAccessKey as string || savedServerR2Config?.secretAccessKey || '')?.trim();
      const { bucket: bucketName, folder: folderPath } = cleanBucketAndFolder(
        req.body?.bucketName || req.query?.bucketName as string || savedServerR2Config?.bucketName || '',
        req.body?.folderPath || req.query?.folderPath as string || savedServerR2Config?.folderPath || ''
      );
      // Pasta alvo prioritária vsl-haus
      const rawFolder = req.body?.folderPath || req.body?.vslFolderPath || req.query?.folderPath || savedServerR2Config?.folderPath || 'vsl-haus';
      const targetFolder = rawFolder.toString().trim().replace(/^\/+|\/+$/g, '');

      let publicDomain = ((req.body?.publicDomain || req.query?.publicDomain as string || savedServerR2Config?.publicDomain || 'https://pub-vsl-optima.r2.dev')).trim().replace(/\/+$/, '');

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(400).json({
          success: false,
          error: 'Credenciais do Cloudflare R2 não foram fornecidas ou configuradas no servidor.'
        });
      }

      if (!publicDomain.startsWith('http://') && !publicDomain.startsWith('https://')) {
        publicDomain = `https://${publicDomain}`;
      }

      // Salva e atualiza credenciais no servidor se enviadas na requisição
      if (accountId && accessKeyId && secretAccessKey && bucketName) {
        savedServerR2Config = {
          accountId,
          accessKeyId,
          secretAccessKey,
          bucketName,
          folderPath: targetFolder,
          publicDomain,
          isConfigured: true,
        };
        try {
          fs.writeFileSync(configPath, JSON.stringify(savedServerR2Config, null, 2), 'utf8');
        } catch (e) {}
      }

      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      console.log(`[R2 SYNC ROUTE] Escaneando pasta "${targetFolder}" no bucket "${bucketName}" no Cloudflare R2...`);

      // Busca objetos com o prefixo da pasta vsl-haus
      const listParams: any = { Bucket: bucketName, MaxKeys: 1000 };
      if (targetFolder) {
        listParams.Prefix = `${targetFolder}/`;
      }

      let listRes = await s3Client.send(new ListObjectsV2Command(listParams));
      let contents = listRes.Contents || [];

      // Caso o prefix com barra não traga resultados, faz a busca geral no bucket e filtra pela pasta
      if (contents.length === 0 && targetFolder) {
        const fallbackCmd = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1000 });
        const fallbackRes = await s3Client.send(fallbackCmd);
        contents = (fallbackRes.Contents || []).filter((item) =>
          item.Key && item.Key.toLowerCase().includes(targetFolder.toLowerCase())
        );
      }

      const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];

      const videoObjects = contents.filter((item) => {
        if (!item.Key) return false;
        const lower = item.Key.toLowerCase();
        const isVideo = videoExtensions.some((ext) => lower.endsWith(ext));
        if (!isVideo) return false;
        if (targetFolder) {
          const targetLower = targetFolder.toLowerCase();
          return lower.startsWith(targetLower + '/') || lower.includes(targetLower);
        }
        return true;
      });

      console.log(`[R2 SYNC ROUTE] Encontrados ${videoObjects.length} vídeos na pasta "${targetFolder}".`);

      const activeKeys = new Set(videoObjects.map((obj) => obj.Key).filter(Boolean));
      const cleanProjectsMap = new Map<string, any>();
      let newAddedCount = 0;

      for (const obj of videoObjects) {
        if (!obj.Key) continue;
        const key = obj.Key;
        const rawFileName = key.split('/').pop() || key;
        const publicUrl = `${publicDomain}/${key}`;
        const streamUrl = `/api/r2/stream?key=${encodeURIComponent(key)}`;

        let presignedUrl = publicUrl;
        try {
          const getCmd = new GetObjectCommand({ Bucket: bucketName, Key: key });
          presignedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 604800 }); // 7 dias
        } catch (e) {
          console.warn('[R2 PRESIGNED URL FAIL]', e);
        }

        // Procura se já existe algum projeto em savedServerProjects que aponta para este mesmo arquivo R2
        const existingProject = savedServerProjects.find((p: any) => {
          if (!p || !p.videoUrl) return false;
          if (p.fileKey === key) return true;
          const urlClean = p.videoUrl.split('?')[0];
          if (urlClean.endsWith(`/${key}`) || urlClean.includes(encodeURIComponent(key)) || urlClean.includes(rawFileName)) return true;
          if (p.secondaryVideoUrl && p.secondaryVideoUrl.includes(encodeURIComponent(key))) return true;
          return false;
        });

        if (existingProject) {
          // Atualiza as URLs do projeto existente e garante a referência à fileKey
          const updatedProj = {
            ...existingProject,
            fileKey: key,
            videoUrl: presignedUrl,
            secondaryVideoUrl: streamUrl,
          };
          cleanProjectsMap.set(key, updatedProj);
        } else {
          // Cria um único novo projeto para este vídeo R2
          let formattedTitle = rawFileName
            .replace(/\.[^/.]+$/, '') // remove extensão
            .replace(/^\d+-/, '')     // remove timestamp inicial
            .replace(/[-_]+/g, ' ')   // substitui hífens por espaço
            .trim();

          if (!formattedTitle || formattedTitle.length < 2) {
            formattedTitle = `Vídeo R2 (${rawFileName})`;
          } else {
            formattedTitle = formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
          }

          const newProject = {
            id: `vsl-r2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: formattedTitle,
            description: `Vídeo importado automaticamente do Cloudflare R2 (${rawFileName})`,
            fileKey: key,
            videoUrl: presignedUrl,
            secondaryVideoUrl: streamUrl,
            aspectRatio: '16:9',
            durationSeconds: 180,
            createdAt: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date().toISOString(),
            totalViews: 0,
            plays: 0,
            completionCount: 0,
            avgWatchTimeSeconds: 0,
            pitchConfig: {
              pitchTimeSeconds: 60,
              ctaText: 'COMPRAR COM DESCONTO EXCLUSIVO',
              ctaUrl: 'https://seuempreendimento.com.br/checkout',
              ctaButtonColor: '#059669',
              pulseEffect: true,
              showCountdown: true,
            },
            retentionData: [],
            events: [],
          };
          cleanProjectsMap.set(key, newProject);
          newAddedCount++;
        }
      }

      // Mantém apenas projetos customizados não-mockups
      const nonR2Projects = savedServerProjects.filter((p: any) => {
        const url = p.videoUrl || '';
        const isMock = url.includes('gtv-videos-bucket') ||
                       url.includes('commondatastorage.googleapis.com') ||
                       url.includes('BigBuckBunny') ||
                       p.id === 'vsl-001' || p.id === 'vsl-002' || p.id === 'vsl-003';
        if (isMock) return false;
        if (p.fileKey && !activeKeys.has(p.fileKey)) return false;
        if (p.id?.startsWith('vsl-r2-')) return false; // Já processados pelo cleanProjectsMap
        return true;
      });

      const baseProjects = [...Array.from(cleanProjectsMap.values()), ...nonR2Projects];

      persistProjectsToServer(baseProjects);

      return res.json({
        success: true,
        message: `Sincronização concluída! ${videoObjects.length} vídeo(s) únicos no R2 (${newAddedCount} novo(s) importado(s)).`,
        totalInR2: videoObjects.length,
        newAdded: newAddedCount,
        projects: baseProjects,
      });
    } catch (err: any) {
      console.error('[R2 SYNC ROUTE] Erro ao sincronizar bucket R2:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Falha ao sincronizar os vídeos do Cloudflare R2.',
      });
    }
  });

  // API Route para Excluir um Vídeo do Cloudflare R2 e Remover do Servidor
  app.all('/api/r2/delete-video', async (req, res) => {
    try {
      const rawKey = (req.body?.fileKey || req.query?.fileKey || req.body?.key || req.query?.key || '').toString().trim();
      const videoUrl = (req.body?.videoUrl || req.query?.videoUrl || '').toString().trim();
      const projectId = (req.body?.projectId || req.query?.projectId || req.body?.id || req.query?.id || '').toString().trim();

      let keyToDelete = rawKey;
      if (!keyToDelete && videoUrl) {
        try {
          const urlObj = new URL(videoUrl);
          let pathname = decodeURIComponent(urlObj.pathname).replace(/^\/+/, '');
          if (savedServerR2Config?.bucketName && pathname.startsWith(savedServerR2Config.bucketName + '/')) {
            pathname = pathname.substring(savedServerR2Config.bucketName.length + 1);
          }
          keyToDelete = pathname;
        } catch (e) {
          const match = videoUrl.match(/(vsl-haus\/[^\?\#]+)/) || videoUrl.match(/([0-9]+-[^\?\#]+)/);
          if (match) keyToDelete = match[1];
        }
      }

      console.log(`[R2 DELETE ROUTE] Solicitação de exclusão do arquivo: "${keyToDelete}" (Projeto ID: ${projectId})`);

      const accountId = cleanAccountId(req.body?.accountId || savedServerR2Config?.accountId || '');
      const accessKeyId = (req.body?.accessKeyId || savedServerR2Config?.accessKeyId || '')?.trim();
      const secretAccessKey = (req.body?.secretAccessKey || savedServerR2Config?.secretAccessKey || '')?.trim();
      const bucketName = (req.body?.bucketName || savedServerR2Config?.bucketName || '')?.trim();

      let r2Deleted = false;
      if (accountId && accessKeyId && secretAccessKey && bucketName && keyToDelete) {
        try {
          const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
          const s3Client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
          });

          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: keyToDelete,
          }));
          r2Deleted = true;
          console.log(`[R2 DELETE ROUTE] Arquivo "${keyToDelete}" excluído com sucesso do bucket "${bucketName}" no R2!`);
        } catch (errR2: any) {
          console.warn('[R2 DELETE ROUTE] Aviso ao tentar excluir objeto no R2:', errR2?.message || errR2);
        }
      }

      // Remove do projeto do servidor
      if (projectId || keyToDelete) {
        savedServerProjects = savedServerProjects.filter((p: any) => {
          if (projectId && p.id === projectId) return false;
          if (keyToDelete) {
            if (p.fileKey === keyToDelete) return false;
            if (p.videoUrl && p.videoUrl.includes(keyToDelete)) return false;
          }
          return true;
        });
        persistProjectsToServer(savedServerProjects);
      }

      return res.json({
        success: true,
        message: 'Vídeo e projeto excluídos do Cloudflare R2 e do servidor!',
        r2Deleted,
        projects: savedServerProjects,
      });
    } catch (err: any) {
      console.error('[R2 DELETE ROUTE] Erro ao excluir vídeo:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Falha ao excluir vídeo.' });
    }
  });

  // API Route para Streaming Direto de Vídeos do Cloudflare R2 (Suporte a Range Requests HTTP 206)
  app.get('/api/r2/stream', async (req, res) => {
    try {
      const rawKey = (req.query.key as string || '').trim();
      if (!rawKey) return res.status(400).send('Key do arquivo é obrigatória.');

      const accountId = cleanAccountId((req.query.accountId as string) || savedServerR2Config?.accountId || '');
      const accessKeyId = ((req.query.accessKeyId as string) || savedServerR2Config?.accessKeyId || '')?.trim();
      const secretAccessKey = ((req.query.secretAccessKey as string) || savedServerR2Config?.secretAccessKey || '')?.trim();
      const bucketName = ((req.query.bucketName as string) || savedServerR2Config?.bucketName || '')?.trim();

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(400).send('Credenciais do Cloudflare R2 não configuradas no servidor.');
      }

      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const rangeHeader = req.headers.range;
      const getObjectParams: any = {
        Bucket: bucketName,
        Key: rawKey,
      };

      if (rangeHeader) {
        getObjectParams.Range = rangeHeader;
      }

      const command = new GetObjectCommand(getObjectParams);
      const r2Response = await s3Client.send(command);

      const ext = rawKey.split('.').pop()?.toLowerCase();
      let contentType = 'video/mp4';
      if (ext === 'webm') contentType = 'video/webm';
      else if (ext === 'mov') contentType = 'video/quicktime';
      else if (ext === 'm4v') contentType = 'video/x-m4v';

      res.setHeader('Content-Type', r2Response.ContentType || contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      if (r2Response.ContentRange) {
        res.setHeader('Content-Range', r2Response.ContentRange);
        res.status(206);
      } else if (r2Response.ContentLength) {
        res.setHeader('Content-Length', r2Response.ContentLength);
        res.status(200);
      }

      if (r2Response.Body) {
        // @ts-ignore
        r2Response.Body.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error('[R2 STREAM ERROR]', err);
      res.status(500).send(err?.message || 'Erro no streaming do vídeo.');
    }
  });

  // API Route para Consultar Credenciais do R2 Salvas no Servidor
  app.get('/api/settings/r2', (req, res) => {
    return res.json({
      success: true,
      config: savedServerR2Config || null,
    });
  });

  // API Route para Salvar Credenciais do R2 no Servidor
  app.post('/api/settings/r2', (req, res) => {
    try {
      const config = req.body;
      if (config && typeof config === 'object') {
        savedServerR2Config = config;
        try {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) {}
        return res.json({ success: true, message: 'Credenciais salvas no servidor com sucesso!' });
      }
      return res.status(400).json({ success: false, error: 'Configuração inválida.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route para Consultar Credenciais do Supabase no Servidor
  app.get('/api/settings/supabase', (req, res) => {
    return res.json({
      success: true,
      config: savedServerSupabaseConfig || null,
    });
  });

  // API Route para Salvar Credenciais do Supabase no Servidor
  app.post('/api/settings/supabase', (req, res) => {
    try {
      const config = req.body;
      if (config && typeof config === 'object') {
        savedServerSupabaseConfig = config;
        try {
          fs.writeFileSync(supabaseConfigPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) {}
        return res.json({ success: true, message: 'Credenciais do Supabase salvas no servidor!' });
      }
      return res.status(400).json({ success: false, error: 'Configuração inválida.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route para Gerar Presigned URL para Upload Direto
  app.all('/api/r2/presign', async (req, res) => {
    try {
      const accountId = cleanAccountId(req.body?.accountId || req.query?.accountId as string);
      const accessKeyId = (req.body?.accessKeyId || req.query?.accessKeyId as string)?.trim();
      const secretAccessKey = (req.body?.secretAccessKey || req.query?.secretAccessKey as string)?.trim();
      const { bucket: bucketName, folder: folderPath } = cleanBucketAndFolder(
        req.body?.bucketName || req.query?.bucketName as string,
        req.body?.folderPath || req.query?.folderPath as string
      );
      let publicDomain = ((req.body?.publicDomain || req.query?.publicDomain as string) || 'https://pub-vsl-optima.r2.dev').trim().replace(/\/+$/, '');
      const fileName = (req.body?.fileName || req.query?.fileName as string)?.trim();
      const contentType = (req.body?.contentType || req.query?.contentType as string)?.trim() || 'video/mp4';

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !fileName) {
        return res.status(400).json({
          error: 'Campos obrigatórios ausentes para gerar URL de upload (Account ID, Access Key, Secret Key, Bucket e Nome do arquivo).'
        });
      }

      if (!publicDomain.startsWith('http://') && !publicDomain.startsWith('https://')) {
        publicDomain = `https://${publicDomain}`;
      }

      const cleanFileName = fileName
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/-+/g, '-');

      const timestamp = Date.now();
      const fileKey = folderPath
        ? `${folderPath}/${timestamp}-${cleanFileName}`
        : `${timestamp}-${cleanFileName}`;

      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Garantir ContentType correto para vídeos e imagens
      let targetContentType = contentType || 'video/mp4';
      if (cleanFileName.endsWith('.mov') || cleanFileName.endsWith('.mp4') || cleanFileName.endsWith('.m4v') || cleanFileName.endsWith('.webm')) {
        targetContentType = 'video/mp4';
      } else if (cleanFileName.endsWith('.png')) {
        targetContentType = 'image/png';
      } else if (cleanFileName.endsWith('.jpg') || cleanFileName.endsWith('.jpeg')) {
        targetContentType = 'image/jpeg';
      }

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: targetContentType,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = `${publicDomain}/${fileKey}`;

      console.log(`[R2 PRESIGN ROUTE] URL pré-assinada gerada com sucesso para endpoint "${endpoint}", bucket "${bucketName}", fileKey "${fileKey}"`);

      return res.json({
        success: true,
        presignedUrl,
        fileKey,
        publicUrl,
      });
    } catch (err: any) {
      console.error('[R2 PRESIGN ROUTE] Erro ao gerar URL pré-assinada:', err);
      return res.status(500).json({
        error: err?.message || 'Erro ao obter URL pré-assinada de upload.',
      });
    }
  });

  // API Route para Upload seguro via Server Proxy (Fallback)
  app.post('/api/r2/upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const accountId = cleanAccountId(req.body?.accountId || req.query?.accountId as string);
      const accessKeyId = (req.body?.accessKeyId || req.query?.accessKeyId as string)?.trim();
      const secretAccessKey = (req.body?.secretAccessKey || req.query?.secretAccessKey as string)?.trim();
      const { bucket: bucketName, folder: folderPath } = cleanBucketAndFolder(
        req.body?.bucketName || req.query?.bucketName as string,
        req.body?.folderPath || req.query?.folderPath as string
      );
      let publicDomain = ((req.body?.publicDomain || req.query?.publicDomain as string) || 'https://pub-vsl-optima.r2.dev').trim().replace(/\/+$/, '');

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(400).json({
          error: 'Credenciais do R2 incompletas (Account ID, Access Key ID, Secret Access Key e Nome do Bucket são obrigatórios).'
        });
      }

      if (!publicDomain.startsWith('http://') && !publicDomain.startsWith('https://')) {
        publicDomain = `https://${publicDomain}`;
      }

      const cleanFileName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/-+/g, '-');

      const timestamp = Date.now();
      const fileKey = folderPath
        ? `${folderPath}/${timestamp}-${cleanFileName}`
        : `${timestamp}-${cleanFileName}`;

      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Garantir ContentType correto para vídeos e imagens no R2
      let targetContentType = file.mimetype || 'video/mp4';
      if (cleanFileName.endsWith('.mov') || cleanFileName.endsWith('.mp4') || cleanFileName.endsWith('.m4v') || cleanFileName.endsWith('.webm')) {
        targetContentType = 'video/mp4';
      } else if (cleanFileName.endsWith('.png')) {
        targetContentType = 'image/png';
      } else if (cleanFileName.endsWith('.jpg') || cleanFileName.endsWith('.jpeg')) {
        targetContentType = 'image/jpeg';
      }

      // Upload usando @aws-sdk/lib-storage para lidar com arquivos grandes de forma otimizada
      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: targetContentType,
        },
      });

      await parallelUploads3.done();

      const publicUrl = `${publicDomain}/${fileKey}`;
      console.log(`[R2 UPLOAD ROUTE] Upload concluído via server proxy! URL pública: ${publicUrl}`);

      return res.json({
        success: true,
        publicUrl,
        fileKey,
      });
    } catch (err: any) {
      console.error('[R2 UPLOAD ROUTE] Erro no upload proxy do R2 no servidor:', err);
      return res.status(500).json({
        error: err?.message || 'Falha ao enviar arquivo para o Cloudflare R2 pelo servidor.',
      });
    }
  });

  // API Route para Testar Conexão e Credenciais do Cloudflare R2 diretamente
  app.all(['/api/r2/test', '/api/r2/test-credentials'], async (req, res) => {
    try {
      const rawAccountId = req.body?.accountId || req.query?.accountId as string || '';
      const rawAccessKeyId = req.body?.accessKeyId || req.query?.accessKeyId as string || '';
      const rawSecretAccessKey = req.body?.secretAccessKey || req.query?.secretAccessKey as string || '';
      const rawBucketName = req.body?.bucketName || req.query?.bucketName as string || '';

      const accountId = cleanAccountId(rawAccountId);
      const accessKeyId = rawAccessKeyId.trim();
      const secretAccessKey = rawSecretAccessKey.trim();
      const { bucket: bucketName } = cleanBucketAndFolder(rawBucketName);

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(200).json({
          success: false,
          error: 'Preencha Account ID (hash de 32 caracteres do Cloudflare), Access Key ID, Secret Access Key e Nome do Bucket para testar.'
        });
      }

      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      console.log(`[R2 TEST ROUTE] Testando credenciais R2 com endpoint: "${endpoint}" e bucket: "${bucketName}"`);

      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      let testSuccess = false;
      let lastError: any = null;

      // Testa a criação e remoção de um objeto de teste no R2 (PutObject + DeleteObject)
      // Funciona com TODOS os tipos de token R2 ("Admin Read & Write" e "Object Read & Write")
      try {
        const testKey = `.r2-test-ping-${Date.now()}.txt`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: testKey,
          Body: 'r2-ping-test',
          ContentType: 'text/plain',
        }));
        testSuccess = true;

        // Limpa o arquivo de teste imediatamente em segundo plano
        s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: testKey })).catch(() => {});
      } catch (err: any) {
        lastError = err;
        console.warn('[R2 TEST ROUTE] PutObject ping falhou:', err?.message || err);

        // Fallback secundário: Tenta ListObjectsV2 se PutObject falhar
        try {
          await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));
          testSuccess = true;
        } catch (listErr: any) {
          console.warn('[R2 TEST ROUTE] ListObjectsV2 também falhou:', listErr?.message || listErr);
        }
      }

      if (testSuccess) {
        return res.json({
          success: true,
          message: `✅ Conexão com o bucket "${bucketName}" no Cloudflare R2 autenticada e validada com sucesso!`,
        });
      }

      // Análise detalhada do erro capturado
      const err = lastError;
      const httpStatusCode = err?.$metadata?.httpStatusCode;
      const errName = err?.name || err?.code || err?.Code || '';
      const rawMessage = err?.message || (typeof err === 'string' ? err : '');
      const combined = `${errName} ${rawMessage} ${httpStatusCode}`.toLowerCase();

      let errMsg = rawMessage || errName || 'Erro de autenticação ou conexão com o R2.';

      if (
        httpStatusCode === 403 ||
        combined.includes('accessdenied') ||
        combined.includes('forbidden')
      ) {
        errMsg = `Permissão insuficiente no Token R2 (Status 403 - Access Denied). Certifique-se de que o Token R2 foi criado com permissão "Admin Read & Write" ou "Object Read & Write" no bucket "${bucketName}".`;
      } else if (
        httpStatusCode === 404 ||
        combined.includes('nosuchbucket')
      ) {
        errMsg = `O bucket "${bucketName}" não existe na sua conta Cloudflare R2 ou o nome foi digitado incorretamente.`;
      } else if (
        combined.includes('invalidaccesskeyid') ||
        combined.includes('signaturedoesnotmatch') ||
        combined.includes('invaliddigest') ||
        combined.includes('baddigest') ||
        combined.includes('authfailure')
      ) {
        errMsg = 'Access Key ID ou Secret Access Key incorretos no Cloudflare. Verifique se copiou as chaves de API R2 inteiras e sem espaços.';
      } else if (
        combined.includes('ssl') ||
        combined.includes('eproto') ||
        combined.includes('handshake') ||
        combined.includes('enotfound') ||
        combined.includes('getaddrinfo')
      ) {
        errMsg = `Erro de SSL/Host ao conectar com o R2. Verifique se o Account ID informado ("${accountId}") é a hash hex de 32 caracteres do seu painel Cloudflare.`;
      }

      return res.status(200).json({
        success: false,
        error: errMsg,
      });
    } catch (err: any) {
      console.error('[R2 TEST ROUTE] Erro inesperado ao testar R2:', err);
      return res.status(200).json({
        success: false,
        error: err?.message || 'Falha ao processar o teste de conexão com o Cloudflare R2.',
      });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Middleware de tratamento de erro para rotas da API (Garante respostas estritamente em JSON)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/') || req.url.startsWith('/api/')) {
      console.error('[API SERVER ERROR]', err);
      return res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erro interno no servidor de API.',
      });
    }
    next(err);
  });

  // Vite Middleware para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server rodando na porta ${PORT}`);
  });
}

startServer();
