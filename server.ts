import express from 'express';
import path from 'path';
import multer from 'multer';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

  app.use(express.json({ limit: '50mb' }));

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

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
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

      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype || 'video/mp4',
        },
        leavePartsOnError: false,
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
  app.all('/api/r2/test', async (req, res) => {
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
