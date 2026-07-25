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
 * Testa as credenciais e conexão com o Bucket R2 via rota backend /api/r2/test
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

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return {
        success: false,
        message: 'O servidor respondeu com formato não-JSON. Aguarde o servidor inicializar e tente novamente.',
      };
    }

    if (res.ok && data.success) {
      return { success: true, message: data.message };
    } else {
      let errMsg =
        data.error ||
        data.message ||
        data.errMsg ||
        (typeof data === 'string' ? data : null);

      if (!errMsg) {
        if (res.status === 405) {
          errMsg = `Falha de Permissão do Token R2 (Status HTTP 405 - Method Not Allowed): O Token do Cloudflare R2 não possui permissão para consultar/listar este bucket. No painel da Cloudflare (R2 > Manage R2 API Tokens), crie um novo Token de API com permissão "Admin Read & Write" ou "Object Read & Write" no bucket "${cleanCreds.bucketName}".`;
        } else if (res.status === 403) {
          errMsg = `Permissão insuficiente no Token R2 (Status HTTP 403 - Access Denied). Certifique-se de que o Token R2 tem permissões de leitura/escrita no bucket "${cleanCreds.bucketName}".`;
        } else {
          errMsg = `Falha na autenticação R2 (Status HTTP ${res.status}).`;
        }
      }

      return { success: false, message: errMsg };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erro ao conectar com o servidor para testar o R2.',
    };
  }
}

/**
 * Realiza o upload para o Cloudflare R2 utilizando presigned URL de upload direto do navegador.
 * Isso garante transmissão ultrarrápida de arquivos grandes sem travar no servidor!
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

  // Tenta obter URL assinada para Upload Direto (Presigned PUT)
  try {
    log(`🔑 Gerando URL pré-assinada de upload direto com o servidor...`);
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

    const presignText = await presignRes.text();
    let presignData: any = {};
    try {
      presignData = presignText ? JSON.parse(presignText) : {};
    } catch {
      presignData = {};
    }

    if (presignRes.ok && presignData.success && presignData.presignedUrl) {
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
              error: `O Cloudflare R2 retornou status ${xhr.status}. Verifique se as permissões da chave R2 permitem a ação PutObject.`,
            });
          }
        };

        xhr.onerror = () => {
          log(`❌ Erro de CORS ou Rede ao enviar diretamente para o R2.`);
          log(`💡 SOLUÇÃO: Adicione a URL deste app na política de CORS do seu Bucket R2 no painel Cloudflare! (Veja a aba Configurações R2 para copiar a regra pronta)`);
          
          // Tenta fallback via proxy do servidor para arquivos pequenos (< 30MB)
          if (file.size < 30 * 1024 * 1024) {
            log(`🔄 Tentando envio alternativo via servidor proxy...`);
            uploadViaServerProxy(file, cleanCreds, onProgress, log)
              .then(resolve)
              .catch(() => resolve({
                success: false,
                publicUrl: defaultPublicUrl,
                error: 'Erro de CORS no navegador. Adicione as URLs da aplicação nas configurações de CORS do seu bucket Cloudflare R2.',
              }));
          } else {
            resolve({
              success: false,
              publicUrl: defaultPublicUrl,
              error: 'Erro de CORS ao enviar para o R2. Acesse a aba "Configurações R2" no menu do app para copiar a regra CORS JSON e colar no seu bucket Cloudflare.',
            });
          }
        };

        xhr.send(file);
      });
    } else {
      log(`⚠️ Falha ao obter presigned URL: ${presignData.error || 'Erro desconhecido'}`);
    }
  } catch (err: any) {
    log(`⚠️ Erro ao tentar presigned upload: ${err?.message}`);
  }

  // Fallback via Server Proxy se presign falhar
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
