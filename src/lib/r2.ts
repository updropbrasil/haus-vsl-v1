import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
 * Testa as credenciais R2 diretamente no navegador (Client-Side) via Presigned URL de Teste.
 * NOTA: O Cloudflare R2 APLICA regras de CORS do Bucket em Presigned URLs de objeto,
 * enquanto chamadas diretas de controle S3 (ListObjectsV2) no navegador são bloqueadas por padrão.
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
    const testKey = `.r2-test-ping-${Date.now()}.txt`;
    const endpoint = `https://${cleanCreds.accountId}.r2.cloudflarestorage.com`;
    const s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
      },
    });

    // 1. Gera Presigned URL para teste de envio (PutObject)
    const putCommand = new PutObjectCommand({
      Bucket: cleanCreds.bucketName,
      Key: testKey,
      ContentType: 'text/plain',
    });

    const presignedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 300 });

    // 2. Faz o teste com a Presigned URL (Ativa o tratamento de CORS do Bucket Cloudflare R2!)
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'r2-ping-test',
    });

    if (putRes.ok || putRes.status === 200 || putRes.status === 204) {
      // Deleta o arquivo temporário de teste
      try {
        const delCommand = new DeleteObjectCommand({
          Bucket: cleanCreds.bucketName,
          Key: testKey,
        });
        const delPresignedUrl = await getSignedUrl(s3Client, delCommand, { expiresIn: 300 });
        fetch(delPresignedUrl, { method: 'DELETE' }).catch(() => {});
      } catch {}

      return {
        success: true,
        message: `✅ Conexão com o bucket "${cleanCreds.bucketName}" no Cloudflare R2 autenticada e validada com sucesso!`,
      };
    }

    if (putRes.status === 403) {
      return {
        success: false,
        message: `Permissão insuficiente no Token R2 ou credenciais incorretas (Status 403 - Access Denied). Verifique se o Token R2 foi criado com permissão "Admin Read & Write" ou "Object Read & Write" no bucket "${cleanCreds.bucketName}".`,
      };
    }

    if (putRes.status === 404) {
      return {
        success: false,
        message: `O bucket "${cleanCreds.bucketName}" ou Account ID não foi encontrado no Cloudflare R2.`,
      };
    }

    return {
      success: false,
      message: `O Cloudflare R2 retornou status HTTP ${putRes.status}. Verifique as credenciais e o nome do bucket "${cleanCreds.bucketName}".`,
    };
  } catch (err: any) {
    const rawMessage = err?.message || (typeof err === 'string' ? err : '');
    const combined = `${err?.name || ''} ${rawMessage}`.toLowerCase();

    if (combined.includes('cors') || combined.includes('network') || combined.includes('failed to fetch')) {
      return {
        success: false,
        message: `Falha ao conectar diretamente do navegador ao Cloudflare R2. Verifique se o Account ID ("${cleanCreds.accountId}") está correto e se a Regra de CORS no bucket "${cleanCreds.bucketName}" permite chamadas do navegador.`,
      };
    }

    return {
      success: false,
      message: rawMessage || 'Erro de conexão diretamente com o Cloudflare R2.',
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
 * Testa as credenciais e conexão com o Bucket R2 via rota backend /api/r2/test (Servidor Node.js)
 * O teste no servidor não possui restrições de CORS e é 100% confiável no ambiente do aplicativo.
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
    let res = await fetch('/api/r2/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
      }),
    });

    // Se a rota POST falhar com 404/405, tenta GET em /api/r2/test-credentials
    if (res.status === 405 || res.status === 404) {
      const params = new URLSearchParams({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
      });
      res = await fetch(`/api/r2/test-credentials?${params.toString()}`, {
        method: 'GET',
      });
    }

    let text = '';
    let data: any = null;
    try {
      text = await res.text();
      if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        data = JSON.parse(text);
      }
    } catch {}

    if (data) {
      if (typeof data.success === 'boolean') {
        return {
          success: data.success,
          message: data.message || data.error || (data.success ? 'Conectado ao Cloudflare R2 com sucesso!' : 'Erro na autenticação com o R2.'),
        };
      }
      if (data.error || data.message) {
        return {
          success: false,
          message: data.error || data.message,
        };
      }
    }

    // Se o backend retornou resposta mas sem JSON legível
    if (!res.ok) {
      return {
        success: false,
        message: `O servidor de teste respondeu com status HTTP ${res.status}. Verifique as credenciais no painel do Cloudflare.`,
      };
    }

    const clientRes = await testR2CredentialsClientSide(cleanCreds);
    return clientRes;
  } catch (err: any) {
    const clientRes = await testR2CredentialsClientSide(cleanCreds);
    if (!clientRes.success && clientRes.message.includes('CORS')) {
      return {
        success: false,
        message: `Não foi possível validar as credenciais. Verifique se o Account ID ("${cleanCreds.accountId}"), a Access Key ID e a Secret Access Key estão corretos e sem espaços em branco.`,
      };
    }
    return clientRes;
  }
}

/**
 * Realiza o upload para o Cloudflare R2.
 * Prioriza o servidor backend Node.js (imune a erros de CORS do navegador) e oferece fallback de presigned URL.
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

  // 1. Tenta envio através do Servidor Backend Express Node.js (Imune a restrições de CORS e presigned URL do navegador)
  log(`📡 Transmitindo arquivo via servidor backend Node.js...`);
  const proxyResult = await uploadViaServerProxy(file, cleanCreds, onProgress, log);
  if (proxyResult.success) {
    return proxyResult;
  }

  log(`⚠️ Envio via servidor proxy indisponível (${proxyResult.error}). Alternando para URL pré-assinada direta...`);

  // 2. Fallback: Presigned URL direto do navegador
  log(`⚡ Gerando URL pré-assinada de upload direto para o Cloudflare R2...`);
  const presignResult = await uploadViaPresignedUrl(file, cleanCreds, onProgress, log);
  if (presignResult.success) {
    return presignResult;
  }

  log(`❌ Falha no upload R2: ${presignResult.error || proxyResult.error || 'Não foi possível completar o envio.'}`);
  return {
    success: false,
    publicUrl: defaultPublicUrl,
    error: proxyResult.error || presignResult.error || 'Falha no upload para o Cloudflare R2.',
  };
}

/**
 * Função auxiliar para upload direto via URL Pré-assinada
 */
async function uploadViaPresignedUrl(
  file: File,
  cleanCreds: CleanR2Config,
  onProgress?: (percentage: number) => void,
  log?: (msg: string) => void
): Promise<{ success: boolean; publicUrl: string; error?: string }> {
  const defaultPublicUrl = `${cleanCreds.publicDomain}/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;

  // Forçar video/mp4 para vídeos no R2 para compatibilidade total de reprodução nos navegadores
  const lowerName = file.name.toLowerCase();
  const isVideo = lowerName.endsWith('.mov') || lowerName.endsWith('.mp4') || lowerName.endsWith('.m4v') || lowerName.endsWith('.webm');
  const uploadContentType = isVideo ? 'video/mp4' : (file.type || 'video/mp4');

  let presignData: any = {};
  try {
    let presignRes = await fetch('/api/r2/presign', {
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
        contentType: uploadContentType,
      }),
    });

    if (presignRes.status === 405 || presignRes.status === 404) {
      const params = new URLSearchParams({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
        folderPath: cleanCreds.folderPath,
        publicDomain: cleanCreds.publicDomain,
        fileName: file.name,
        contentType: uploadContentType,
      });
      presignRes = await fetch(`/api/r2/presign?${params.toString()}`, {
        method: 'GET',
      });
    }

    if (presignRes.ok) {
      const presignText = await presignRes.text();
      presignData = presignText ? JSON.parse(presignText) : {};
    }
  } catch {}

  if (!presignData || !presignData.presignedUrl) {
    try {
      if (log) log(`⚡ Gerando URL pré-assinada diretamente no navegador...`);
      presignData = await generatePresignedUrlClientSide(
        cleanCreds,
        file.name,
        uploadContentType
      );
    } catch (err: any) {
      if (log) log(`⚠️ Falha ao gerar URL pré-assinada no navegador: ${err?.message}`);
    }
  }

  if (!presignData || !presignData.presignedUrl) {
    return {
      success: false,
      publicUrl: defaultPublicUrl,
      error: 'Não foi possível gerar a URL pré-assinada de upload.',
    };
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignData.presignedUrl);
    xhr.setRequestHeader('Content-Type', uploadContentType);

    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
          if (onProgress) onProgress(pct);
          if (log) log(`⬆️ Transmitindo diretamente para R2: ${pct}% (${(e.loaded / (1024 * 1024)).toFixed(1)} MB / ${(e.total / (1024 * 1024)).toFixed(1)} MB)`);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        if (log) log(`✅ Upload concluído com sucesso no Cloudflare R2!`);
        if (log) log(`🔗 URL pública do vídeo: ${presignData.publicUrl}`);
        resolve({ success: true, publicUrl: presignData.publicUrl });
      } else {
        if (log) log(`❌ HTTP ${xhr.status} no upload direto R2.`);
        resolve({
          success: false,
          publicUrl: defaultPublicUrl,
          error: `O Cloudflare R2 retornou status ${xhr.status}.`,
        });
      }
    };

    xhr.onerror = () => {
      if (log) log(`⚠️ Bloqueio de CORS ou rede no envio direto R2.`);
      resolve({
        success: false,
        publicUrl: defaultPublicUrl,
        error: 'Bloqueio de CORS ou conexão no envio direto.',
      });
    };

    xhr.send(file);
  });
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
      // Importante: Para o Multer processar corretamente no Node.js, os campos de texto DEVEM vir ANTES do arquivo!
      const formData = new FormData();
      formData.append('accountId', cleanCreds.accountId);
      formData.append('accessKeyId', cleanCreds.accessKeyId);
      formData.append('secretAccessKey', cleanCreds.secretAccessKey);
      formData.append('bucketName', cleanCreds.bucketName);
      formData.append('folderPath', cleanCreds.folderPath);
      formData.append('publicDomain', cleanCreds.publicDomain);
      formData.append('file', file);

      const params = new URLSearchParams({
        accountId: cleanCreds.accountId,
        accessKeyId: cleanCreds.accessKeyId,
        secretAccessKey: cleanCreds.secretAccessKey,
        bucketName: cleanCreds.bucketName,
        folderPath: cleanCreds.folderPath,
        publicDomain: cleanCreds.publicDomain,
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/r2/upload?${params.toString()}`);

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
            const errDetail = data.error || `Erro HTTP ${xhr.status}`;
            if (log) log(`❌ Falha no servidor proxy (${xhr.status}): ${errDetail}`);
            resolve({ success: false, publicUrl: defaultPublicUrl, error: errDetail });
          }
        } catch {
          if (log) log(`❌ Erro no formato de resposta do servidor (HTTP ${xhr.status}).`);
          resolve({ success: false, publicUrl: defaultPublicUrl, error: 'Resposta inválida do servidor.' });
        }
      };

      xhr.onerror = () => {
        if (log) log(`❌ Erro de conexão com o servidor proxy.`);
        resolve({ success: false, publicUrl: defaultPublicUrl, error: 'Erro de conexão com o servidor de upload.' });
      };

      xhr.send(formData);
    } catch (err: any) {
      if (log) log(`❌ Exceção ao enviar para o servidor proxy: ${err?.message}`);
      resolve({ success: false, publicUrl: defaultPublicUrl, error: err?.message || 'Falha no upload.' });
    }
  });
}
