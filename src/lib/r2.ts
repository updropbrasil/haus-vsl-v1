import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudflareR2Credentials } from '../types';

export interface CleanR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  folderPath: string;
  publicDomain: string;
}

/**
 * Higieniza as credenciais digitadas pelo usuário para evitar erros comuns de formatação.
 */
export function sanitizeR2Credentials(
  rawCreds: Partial<CloudflareR2Credentials>,
  defaultFolder: string = 'vsl-haus'
): CleanR2Config {
  let rawBucket = (rawCreds.bucketName !== undefined ? rawCreds.bucketName : 'jasondias-videos').trim();
  let extractedFolder = defaultFolder;

  if (rawBucket.includes('/')) {
    const parts = rawBucket.split('/').filter(Boolean);
    if (parts.length > 0) {
      rawBucket = parts[0];
      if (parts.length > 1) {
        extractedFolder = parts.slice(1).join('/');
      }
    }
  }

  let accountId = (rawCreds.accountId || '').trim();
  const hexMatch = accountId.match(/([a-f0-9]{32})/i);
  if (hexMatch) {
    accountId = hexMatch[1].toLowerCase();
  } else {
    accountId = accountId
      .replace(/^https?:\/\//i, '')
      .replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  let publicDomain = (rawCreds.publicDomain || 'https://pub-8e2cb656649243e49a2cdd3f4ca9d4c.r2.dev').trim();
  publicDomain = publicDomain.replace(/\/+$/, '');
  if (publicDomain && !publicDomain.startsWith('http://') && !publicDomain.startsWith('https://')) {
    publicDomain = `https://${publicDomain}`;
  }

  return {
    accountId,
    accessKeyId: (rawCreds.accessKeyId || '').trim(),
    secretAccessKey: (rawCreds.secretAccessKey || '').trim(),
    bucketName: rawBucket,
    folderPath: extractedFolder.trim().replace(/^\/+|\/+$/g, ''),
    publicDomain,
  };
}

/**
 * Testa as credenciais R2 diretamente no navegador (Client-Side) via AWS S3 SDK
 */
export async function testR2CredentialsClientSide(
  cleanCreds: CleanR2Config
): Promise<{ success: boolean; message: string }> {
  if (!cleanCreds.accountId || !cleanCreds.accessKeyId || !cleanCreds.secretAccessKey || !cleanCreds.bucketName) {
    return {
      success: false,
      message: 'Credenciais R2 incompletas (Account ID, Access Key ID, Secret Access Key e Nome do Bucket são obrigatórios).',
    };
  }

  try {
    const endpoint = `https://${cleanCreds.accountId}.r2.cloudflarestorage.com`;
    const s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
      },
    });

    let testSuccess = false;
    let lastError: any = null;

    // 1. Tenta ListObjectsV2
    try {
      await s3Client.send(new ListObjectsV2Command({ Bucket: cleanCreds.bucketName, MaxKeys: 1 }));
      testSuccess = true;
    } catch (err: any) {
      lastError = err;
    }

    // 2. Se ListObjectsV2 falhar (ex: token criado apenas com permissão de "Object Read & Write"), tenta um PutObject + DeleteObject ping
    if (!testSuccess) {
      try {
        const testKey = `.r2-test-ping-${Date.now()}.txt`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: cleanCreds.bucketName,
            Key: testKey,
            Body: 'r2-ping',
            ContentType: 'text/plain',
          })
        );
        testSuccess = true;
        s3Client.send(new DeleteObjectCommand({ Bucket: cleanCreds.bucketName, Key: testKey })).catch(() => {});
      } catch (err: any) {
        lastError = err;
      }
    }

    if (testSuccess) {
      return {
        success: true,
        message: `✅ Conexão com o bucket "${cleanCreds.bucketName}" no Cloudflare R2 autenticada e validada com sucesso!`,
      };
    }

    const err = lastError;
    const rawMessage = err?.message || (typeof err === 'string' ? err : '');
    const combined = `${err?.name || ''} ${rawMessage}`.toLowerCase();

    if (combined.includes('cors') || combined.includes('network') || combined.includes('failed to fetch')) {
      return {
        success: false,
        message: `Bloqueio de CORS no navegador ao acessar o R2. No painel Cloudflare (R2 > Bucket "${cleanCreds.bucketName}" > Settings > CORS Policy), cole a regra JSON autorizando AllowedOrigins: ["*"].`,
      };
    }

    if (combined.includes('accessdenied') || combined.includes('forbidden') || combined.includes('403')) {
      return {
        success: false,
        message: `Permissão insuficiente no Token R2 (Status 403 - Access Denied). Certifique-se de que o Token R2 foi criado com permissão "Admin Read & Write" ou "Object Read & Write" no bucket "${cleanCreds.bucketName}".`,
      };
    }

    return {
      success: false,
      message: rawMessage || `Falha ao autenticar no Cloudflare R2. Verifique o Account ID, Access Key ID e Secret Access Key.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erro de conexão diretamente com o Cloudflare R2.',
    };
  }
}

/**
 * Gerador de Presigned URL no navegador (Client-Side)
 */
export async function generatePresignedUrlClientSide(
  cleanCreds: CleanR2Config,
  fileName: string,
  contentType: string
): Promise<{ presignedUrl: string; publicUrl: string; fileKey: string }> {
  const endpoint = `https://${cleanCreds.accountId}.r2.cloudflarestorage.com`;
  const s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: cleanCreds.accessKeyId,
      secretAccessKey: cleanCreds.secretAccessKey,
    },
  });

  const cleanFileName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-');

  const timestamp = Date.now();
  const fileKey = cleanCreds.folderPath
    ? `${cleanCreds.folderPath}/${timestamp}-${cleanFileName}`
    : `${timestamp}-${cleanFileName}`;

  const command = new PutObjectCommand({
    Bucket: cleanCreds.bucketName,
    Key: fileKey,
    ContentType: contentType || 'video/mp4',
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `${cleanCreds.publicDomain}/${fileKey}`;

  return { presignedUrl, publicUrl, fileKey };
}

/**
 * Testa as credenciais e conexão com o Bucket R2 via rota backend /api/r2/test com fallback inteligente
 */
export async function testR2CredentialsServer(
  rawCreds: Partial<CloudflareR2Credentials>
): Promise<{ success: boolean; message: string }> {
  const cleanCreds = sanitizeR2Credentials(rawCreds);

  if (!cleanCreds.accountId || !cleanCreds.accessKeyId || !cleanCreds.secretAccessKey || !cleanCreds.bucketName) {
    return {
      success: false,
      message: 'Credenciais R2 incompletas (Account ID, Access Key ID, Secret Access Key e Nome do Bucket são obrigatórios).',
    };
  }

  try {
    const res = await fetch('/api/r2/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (typeof data.success === 'boolean') {
        return {
          success: data.success,
          message: data.message || data.error || (data.success ? 'Conectado ao R2!' : 'Erro na autenticação com o R2.'),
        };
      } else if (data.error || data.message) {
        return {
          success: false,
          message: data.error || data.message,
        };
      }
    }

    // Apenas tenta no navegador se o backend for um 404 estático sem API endpoint
    return await testR2CredentialsClientSide(cleanCreds);
  } catch {
    return await testR2CredentialsClientSide(cleanCreds);
  }
}

/**
 * Realiza o upload para o Cloudflare R2 utilizando presigned URL de upload direto do navegador.
 * Suporta execuções via backend Express ou fallbacks direct client-side no navegador!
 */
export async function uploadFileToR2(
  file: File,
  rawCreds: CloudflareR2Credentials,
  customFolder?: string,
  onProgress?: (percentage: number) => void,
  onLog?: (msg: string) => void
): Promise<{ success: boolean; publicUrl: string; error?: string }> {
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const formattedMsg = `[${time}] ${msg}`;
    console.log(formattedMsg);
    if (onLog) onLog(formattedMsg);
  };

  const cleanCreds = sanitizeR2Credentials(rawCreds, customFolder || 'vsl-haus');

  log(`🚀 Preparando upload para o Cloudflare R2...`);
  log(`📄 Arquivo: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB, tipo: ${file.type || 'video/mp4'})`);
  log(`🔑 Bucket: "${cleanCreds.bucketName}" | Pasta: "${cleanCreds.folderPath || 'raiz'}"`);

  const cleanFileName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-');

  const timestamp = Date.now();
  const fileKey = cleanCreds.folderPath
    ? `${cleanCreds.folderPath}/${timestamp}-${cleanFileName}`
    : `${timestamp}-${cleanFileName}`;

  const defaultPublicUrl = `${cleanCreds.publicDomain}/${fileKey}`;

  if (!cleanCreds.accessKeyId || !cleanCreds.secretAccessKey || !cleanCreds.accountId) {
    log(`⚠️ Credenciais R2 não preenchidas. Usando modo de pré-visualização local.`);
    return {
      success: true,
      publicUrl: defaultPublicUrl,
      error: 'Modo simulação: adicione Access Key ID e Secret Access Key para upload no R2.',
    };
  }

  // Obter URL assinada para Upload Direto (Presigned PUT)
  let presignData: any = {};
  try {
    log(`🔑 Solicitando URL pré-assinada de upload direto...`);
    const presignRes = await fetch('/api/r2/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
        folderPath: cleanCreds.folderPath,
        publicDomain: cleanCreds.publicDomain,
        fileName: file.name,
        contentType: file.type || 'video/mp4',
      }),
    });

    if (presignRes.ok) {
      const presignText = await presignRes.text();
      presignData = presignText ? JSON.parse(presignText) : {};
    }
  } catch {
    presignData = {};
  }

  // Se a rota presign no servidor não respondeu ou falhou (ex: deploy em host estático), gera no navegador!
  if (!presignData || !presignData.presignedUrl) {
    try {
      log(`⚡ Gerando URL pré-assinada diretamente no navegador...`);
      presignData = await generatePresignedUrlClientSide(
        cleanCreds,
        file.name,
        file.type || 'video/mp4'
      );
    } catch (err: any) {
      log(`⚠️ Falha ao gerar URL pré-assinada no navegador: ${err?.message}`);
    }
  }

  if (presignData && presignData.presignedUrl) {
    log(`📡 Conexão aberta! Transmitindo diretamente do navegador para o R2...`);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignData.presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
            if (onProgress) onProgress(pct);
            log(`⬆️ Transmitindo para o Cloudflare R2: ${pct}% (${(e.loaded / (1024 * 1024)).toFixed(1)} MB / ${(e.total / (1024 * 1024)).toFixed(1)} MB)`);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          log(`✅ Upload concluído com sucesso e salvo no R2!`);
          log(`🔗 URL pública do vídeo: ${presignData.publicUrl}`);
          resolve({ success: true, publicUrl: presignData.publicUrl });
        } else {
          log(`❌ Erro HTTP ${xhr.status} no upload direto R2.`);
          resolve({
            success: false,
            publicUrl: defaultPublicUrl,
            error: `O Cloudflare R2 retornou status ${xhr.status}. Verifique se as permissões do Token R2 permitem a ação PutObject.`,
          });
        }
      };

      xhr.onerror = () => {
        log(`❌ Erro de CORS ou Rede ao enviar diretamente para o R2.`);
        log(`💡 SOLUÇÃO: Copie a regra de CORS na aba "Configurações R2" e cole no seu bucket Cloudflare.`);
        
        if (file.size < 30 * 1024 * 1024) {
          log(`🔄 Tentando envio alternativo via servidor proxy...`);
          uploadViaServerProxy(file, cleanCreds, onProgress, log)
            .then(resolve)
            .catch(() => resolve({
              success: false,
              publicUrl: defaultPublicUrl,
              error: 'Erro de CORS no navegador. Adicione a regra de CORS no seu bucket Cloudflare R2.',
            }));
        } else {
          resolve({
            success: false,
            publicUrl: defaultPublicUrl,
            error: 'Erro de CORS ao enviar para o R2. Acesse a aba "Configurações R2" para copiar o JSON de CORS e colar no Cloudflare.',
          });
        }
      };

      xhr.send(file);
    });
  }

  // Fallback via Server Proxy se presign falhar completamente
  log(`🔄 Usando rota alternativa de servidor...`);
  return uploadViaServerProxy(file, cleanCreds, onProgress, log);
}

/**
 * Função auxiliar para upload via Server Proxy (Fallback)
 */
async function uploadViaServerProxy(
  file: File,
  cleanCreds: CleanR2Config,
  onProgress?: (pct: number) => void,
  log?: (msg: string) => void
): Promise<{ success: boolean; publicUrl: string; error?: string }> {
  const defaultPublicUrl = `${cleanCreds.publicDomain}/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
  
  return new Promise((resolve) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', cleanCreds.accountId);
      formData.append('accessKeyId', cleanCreds.accessKeyId);
      formData.append('secretAccessKey', cleanCreds.secretAccessKey);
      formData.append('bucketName', cleanCreds.bucketName);
      formData.append('folderPath', cleanCreds.folderPath);
      formData.append('publicDomain', cleanCreds.publicDomain);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/r2/upload');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            if (onProgress) onProgress(100);
            if (log) log(`✅ Upload concluído via servidor proxy! URL: ${data.publicUrl}`);
            resolve({ success: true, publicUrl: data.publicUrl });
          } else {
            resolve({ success: false, publicUrl: defaultPublicUrl, error: data.error || 'Erro no servidor' });
          }
        } catch {
          resolve({ success: false, publicUrl: defaultPublicUrl, error: 'Resposta inválida do servidor.' });
        }
      };

      xhr.onerror = () => {
        resolve({ success: false, publicUrl: defaultPublicUrl, error: 'Erro de conexão com o servidor de upload.' });
      };

      xhr.send(formData);
    } catch (err: any) {
      resolve({ success: false, publicUrl: defaultPublicUrl, error: err?.message || 'Falha no upload.' });
    }
  });
}
