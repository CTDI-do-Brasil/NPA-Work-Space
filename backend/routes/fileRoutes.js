const express = require('express');
const multer = require('multer');
const {
  uploadFiles,
  listFiles,
  viewFile,
  downloadFile,
  getPresignedUrl,
  deleteFile
} = require('../controllers/fileController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Configure Multer for in-memory buffer storage with 200MB limit for media/videos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs, Images, Videos, and common document formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/x-matroska',
      'video/quicktime',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo '${file.mimetype}' não suportado.`), false);
    }
  }
});

// 1. Upload route - accepts multiple or single under 'files' or 'file'
router.post('/upload', authenticateToken, upload.array('files', 10), uploadFiles);

// 2. List files
router.get('/', authenticateToken, listFiles);

// 3. View file inline (streaming for <iframe>, <img>, <video>)
// Matches routes like /api/files/view/pdfs/SP930.pdf or /api/files/view/images/sample.png
router.get('/view/{*filePath}', viewFile);

// 4. Download file with attachment header
router.get('/download/{*filePath}', downloadFile);

// 5. Presigned URL generator
router.get('/presigned/{*filePath}', authenticateToken, getPresignedUrl);

// 6. Delete file (Admin only)
router.delete('/{*filePath}', authenticateToken, authorizeRoles('Admin'), deleteFile);

module.exports = router;
