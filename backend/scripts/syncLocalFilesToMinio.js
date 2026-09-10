const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const minioService = require('../services/minioService');

async function syncDirectory(localDir, s3Folder) {
  if (!fs.existsSync(localDir)) {
    console.log(`[SYNC] Diretório ${localDir} não encontrado. Pulando.`);
    return;
  }

  const files = fs.readdirSync(localDir);
  console.log(`[SYNC] Processando ${files.length} arquivo(s) de: ${localDir} -> ${s3Folder}/`);

  for (const file of files) {
    const filePath = path.join(localDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const buffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(file) || 'application/octet-stream';
      const objectName = `${s3Folder}/${file}`;

      try {
        await minioService.uploadBuffer(objectName, buffer, mimeType, {
          source: 'local-sync',
          originalName: encodeURIComponent(file)
        });
        console.log(`  ✓ Enviado: ${objectName} (${(stat.size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`  ✗ Erro ao enviar ${file}:`, err.message);
      }
    }
  }
}

async function runSync() {
  console.log('====================================================');
  console.log('  NPA Work Space - Sincronização de Arquivos para o MinIO');
  console.log('====================================================');

  const ready = await minioService.initMinio();
  if (!ready) {
    console.error('[ERRO] Não foi possível conectar ao MinIO. Inicie o MinIO antes de sincronizar.');
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, '../..');

  // 1. Sincronizar PDFs visuais
  const visualPdfs = path.join(rootDir, 'frontend', 'public', 'visual');
  await syncDirectory(visualPdfs, 'pdfs/visual');

  // 2. Sincronizar imagens públicas
  const publicImages = path.join(rootDir, 'frontend', 'public');
  const imageFiles = fs.existsSync(publicImages) ? fs.readdirSync(publicImages).filter(f => f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.jpg')) : [];
  for (const file of imageFiles) {
    const filePath = path.join(publicImages, file);
    const buffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(file) || 'image/png';
    const objectName = `images/${file}`;
    try {
      await minioService.uploadBuffer(objectName, buffer, mimeType, { source: 'local-sync' });
      console.log(`  ✓ Imagem enviada: ${objectName}`);
    } catch (err) {
      console.error(`  ✗ Erro imagem ${file}:`, err.message);
    }
  }

  // 3. Sincronizar PPTX de critérios cosméticos
  const pptxDir = path.join(rootDir, 'Critério cosmético Cielo - Visual');
  await syncDirectory(pptxDir, 'docs/criterios-pptx');

  console.log('====================================================');
  console.log('  Sincronização concluída com sucesso!');
  console.log('====================================================');
  process.exit(0);
}

runSync().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
