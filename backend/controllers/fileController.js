const path = require('path');
const mime = require('mime-types');
const minioService = require('../services/minioService');

/**
 * Determine folder prefix based on mimetype
 */
const getFolderByMime = (mimeType) => {
  if (!mimeType) return 'others';
  if (mimeType === 'application/pdf') return 'pdfs';
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType === 'text/plain'
  ) {
    return 'docs';
  }
  return 'others';
};

/**
 * Sanitize filename to prevent directory traversal or invalid S3 characters
 */
const sanitizeFileName = (fileName) => {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9._-]/g, '_') // sanitize special chars
    .replace(/_+/g, '_');
};

/**
 * Extract object name from request parameters (supports Express 5 wildcard parameter)
 */
const extractObjectName = (req) => {
  if (Array.isArray(req.params.filePath)) {
    return req.params.filePath.join('/');
  }
  if (typeof req.params.filePath === 'string') {
    return req.params.filePath;
  }
  if (req.params.folder && req.params.filename) {
    return `${req.params.folder}/${req.params.filename}`;
  }
  return req.params[0] || req.params.filename || '';
};

/**
 * Upload single or multiple files to MinIO
 */
const uploadFiles = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado para upload.' });
    }

    const uploaded = [];

    for (const file of files) {
      const mimeType = file.mimetype || mime.lookup(file.originalname) || 'application/octet-stream';
      const folder = req.body.folder || getFolderByMime(mimeType);
      const safeName = sanitizeFileName(file.originalname);
      
      // If preserveOriginalName is true (useful for fixed assets like SP930.pdf), use without timestamp
      const preserveName = req.body.preserveName === 'true' || req.body.preserveName === true;
      const objectName = preserveName ? `${folder}/${safeName}` : `${folder}/${Date.now()}_${safeName}`;

      await minioService.uploadBuffer(objectName, file.buffer, mimeType, {
        originalName: encodeURIComponent(file.originalname),
        uploadedBy: req.user ? String(req.user.id) : 'anonymous'
      });

      uploaded.push({
        objectName,
        fileName: file.originalname,
        size: file.size,
        mimeType,
        folder,
        viewUrl: `/api/files/view/${objectName}`,
        downloadUrl: `/api/files/download/${objectName}`
      });
    }

    res.status(201).json({
      message: `${uploaded.length} arquivo(s) armazenado(s) com sucesso no MinIO.`,
      files: uploaded
    });
  } catch (error) {
    console.error('[MINIO_UPLOAD_ERROR]', error);
    res.status(500).json({ error: 'Erro ao fazer upload do arquivo para o MinIO: ' + error.message });
  }
};

/**
 * List files stored in MinIO
 */
const listFiles = async (req, res) => {
  try {
    const folder = req.query.folder || '';
    const prefix = folder ? (folder.endsWith('/') ? folder : `${folder}/`) : '';
    const objects = await minioService.listObjects(prefix, true);

    const formatted = objects.map((obj) => {
      const parts = obj.name.split('/');
      const fileName = parts[parts.length - 1];
      const mimeType = mime.lookup(fileName) || 'application/octet-stream';

      return {
        objectName: obj.name,
        fileName,
        size: obj.size,
        lastModified: obj.lastModified,
        etag: obj.etag,
        mimeType,
        viewUrl: `/api/files/view/${obj.name}`,
        downloadUrl: `/api/files/download/${obj.name}`
      };
    });

    res.status(200).json({
      bucket: minioService.DEFAULT_BUCKET,
      total: formatted.length,
      files: formatted
    });
  } catch (error) {
    console.error('[MINIO_LIST_ERROR]', error);
    res.status(500).json({ error: 'Erro ao listar arquivos do MinIO: ' + error.message });
  }
};

/**
 * Stream/View file inline (PDFs, Images, Videos)
 */
const viewFile = async (req, res) => {
  try {
    const objectName = extractObjectName(req);

    if (!objectName) {
      return res.status(400).json({ error: 'Nome do arquivo não especificado.' });
    }

    const stat = await minioService.statObject(objectName);
    const mimeType = stat.metaData['content-type'] || mime.lookup(objectName) || 'application/octet-stream';

    // Headers for streaming and inline display
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(objectName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = await minioService.getObjectStream(objectName);
    stream.pipe(res);
  } catch (error) {
    if (error.code === 'NotFound' || error.message.includes('Not Found')) {
      return res.status(404).json({ error: 'Arquivo não encontrado no MinIO.' });
    }
    console.error('[MINIO_VIEW_ERROR]', error);
    res.status(500).json({ error: 'Erro ao visualizar o arquivo: ' + error.message });
  }
};

/**
 * Download file as attachment
 */
const downloadFile = async (req, res) => {
  try {
    const objectName = extractObjectName(req);

    if (!objectName) {
      return res.status(400).json({ error: 'Nome do arquivo não especificado.' });
    }

    const stat = await minioService.statObject(objectName);
    const mimeType = stat.metaData['content-type'] || mime.lookup(objectName) || 'application/octet-stream';
    const baseName = path.basename(objectName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);

    const stream = await minioService.getObjectStream(objectName);
    stream.pipe(res);
  } catch (error) {
    if (error.code === 'NotFound' || error.message.includes('Not Found')) {
      return res.status(404).json({ error: 'Arquivo não encontrado no MinIO.' });
    }
    console.error('[MINIO_DOWNLOAD_ERROR]', error);
    res.status(500).json({ error: 'Erro ao fazer download do arquivo: ' + error.message });
  }
};

/**
 * Get presigned URL for direct access
 */
const getPresignedUrl = async (req, res) => {
  try {
    const objectName = extractObjectName(req);
    const expiry = parseInt(req.query.expiry || '86400', 10); // 24h default

    if (!objectName) {
      return res.status(400).json({ error: 'Nome do arquivo não especificado.' });
    }

    const url = await minioService.getPresignedUrl(objectName, expiry);
    res.status(200).json({ objectName, presignedUrl: url, expirySeconds: expiry });
  } catch (error) {
    console.error('[MINIO_PRESIGNED_ERROR]', error);
    res.status(500).json({ error: 'Erro ao gerar URL assinada: ' + error.message });
  }
};

/**
 * Delete file from MinIO
 */
const deleteFile = async (req, res) => {
  try {
    const objectName = extractObjectName(req);

    if (!objectName) {
      return res.status(400).json({ error: 'Nome do arquivo não especificado.' });
    }

    await minioService.removeObject(objectName);
    res.status(200).json({ message: `Arquivo '${objectName}' excluído com sucesso do MinIO.` });
  } catch (error) {
    console.error('[MINIO_DELETE_ERROR]', error);
    res.status(500).json({ error: 'Erro ao excluir o arquivo: ' + error.message });
  }
};

module.exports = {
  uploadFiles,
  listFiles,
  viewFile,
  downloadFile,
  getPresignedUrl,
  deleteFile
};
