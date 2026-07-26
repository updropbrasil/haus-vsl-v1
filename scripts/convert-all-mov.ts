import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function run() {
  console.log('[CONVERT SCRIPT] Iniciando conversão de arquivos .MOV no R2 para .MP4 (H.264 / AAC)...');

  const r2ConfigPath = path.join(process.cwd(), '.r2-config.json');
  if (!fs.existsSync(r2ConfigPath)) {
    console.error('Arquivo .r2-config.json não encontrado.');
    return;
  }

  const r2Config = JSON.parse(fs.readFileSync(r2ConfigPath, 'utf8'));
  const accountId = (r2Config.accountId || '').replace(/[^a-f0-9]/gi, '');
  const accessKeyId = (r2Config.accessKeyId || '').trim();
  const secretAccessKey = (r2Config.secretAccessKey || '').trim();
  const bucketName = (r2Config.bucketName || '').trim();
  const publicDomain = (r2Config.publicDomain || '').trim().replace(/\/+$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('Credenciais R2 incompletas.');
    return;
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1000 }));
  const contents = listRes.Contents || [];

  const movItems = contents.filter((item) => item.Key && item.Key.toLowerCase().endsWith('.mov'));
  console.log(`[CONVERT SCRIPT] Encontrados ${movItems.length} arquivo(s) .MOV no bucket "${bucketName}".`);

  const existingKeys = new Set(contents.map((item) => item.Key));

  let projects: any[] = [];
  const projectsPath = path.join(process.cwd(), '.vsl-projects.json');
  if (fs.existsSync(projectsPath)) {
    try {
      projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    } catch (e) {}
  }

  for (let i = 0; i < movItems.length; i++) {
    const item = movItems[i];
    const movKey = item.Key!;
    const mp4Key = movKey.replace(/\.mov$/i, '.mp4');

    console.log(`\n[${i + 1}/${movItems.length}] Processando: ${movKey}`);

    let needUpload = true;
    if (existingKeys.has(mp4Key)) {
      console.log(`  -> Versão .MP4 já existe no R2: ${mp4Key}`);
      needUpload = false;
    }

    if (needUpload) {
      const tmpIn = `/tmp/in_${Date.now()}_${i}.mov`;
      const tmpOut = `/tmp/out_${Date.now()}_${i}.mp4`;

      try {
        console.log(`  -> Baixando .MOV do R2 (${(item.Size || 0) / 1024 / 1024} MB)...`);
        const getRes = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: movKey }));
        const chunks: Buffer[] = [];
        // @ts-ignore
        for await (const chunk of getRes.Body) {
          chunks.push(chunk);
        }
        fs.writeFileSync(tmpIn, Buffer.concat(chunks));

        console.log(`  -> Convertendo para .MP4 (H.264/AAC + faststart) usando ffmpeg...`);
        const start = Date.now();
        execSync(`ffmpeg -y -i "${tmpIn}" -c:v libx264 -preset ultrafast -crf 24 -c:a aac -movflags +faststart "${tmpOut}"`, {
          stdio: 'inherit',
        });
        console.log(`  -> Conversão concluída em ${((Date.now() - start) / 1000).toFixed(1)}s! Tamanho gerado: ${(fs.statSync(tmpOut).size / 1024 / 1024).toFixed(1)} MB`);

        console.log(`  -> Enviando .MP4 convertido para o R2 em: ${mp4Key}...`);
        const fileStream = fs.createReadStream(tmpOut);
        const uploader = new Upload({
          client: s3Client,
          params: {
            Bucket: bucketName,
            Key: mp4Key,
            Body: fileStream,
            ContentType: 'video/mp4',
          },
        });
        await uploader.done();
        console.log(`  -> Upload do .MP4 no R2 realizado com sucesso!`);
      } catch (err: any) {
        console.error(`  -> Erro ao converter/enviar ${movKey}:`, err?.message || err);
      } finally {
        if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      }
    }

    // Atualiza mapeamento no projeto
    const newStreamUrl = `/api/r2/stream?key=${encodeURIComponent(mp4Key)}`;
    const newPublicUrl = `${publicDomain}/${mp4Key}`;

    let updatedCount = 0;
    projects = projects.map((p) => {
      if (!p) return p;
      if (p.fileKey === movKey || (p.videoUrl && p.videoUrl.includes(encodeURIComponent(movKey)))) {
        updatedCount++;
        return {
          ...p,
          fileKey: mp4Key,
          videoUrl: newStreamUrl,
          secondaryVideoUrl: newPublicUrl,
        };
      }
      return p;
    });

    if (updatedCount > 0) {
      console.log(`  -> Atualizados ${updatedCount} projeto(s) para apontar para o novo .MP4.`);
    }
  }

  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf8');
  console.log('\n[CONVERT SCRIPT] Processo concluído! Todos os vídeos .MOV agora possuem versão .MP4 universal e persistida.');
}

run().catch(console.error);
