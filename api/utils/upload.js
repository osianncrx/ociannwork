const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Allowed MIME types and desired extensions
const mimeToExtension = {
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',

  // Audio
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/m4a': 'm4a',

  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/avi': 'avi',
  'video/mov': 'mov',
  'video/wmv': 'wmv',
  'video/mkv': 'mkv',

  // Documents
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
};

// File size limits (in bytes)
const fileSizeLimits = {
  image: 10 * 1024 * 1024,    // 10MB
  audio: 50 * 1024 * 1024,    // 50MB
  video: 100 * 1024 * 1024,   // 100MB
  document: 25 * 1024 * 1024, // 25MB
  file: 25 * 1024 * 1024      // 25MB
};

// Utility to get file type prefix
const getTypePrefix = (mimetype) => {
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf' ||
    mimetype.includes('document') ||
    mimetype.includes('text') ||
    mimetype.includes('sheet') ||
    mimetype.includes('presentation')) return 'doc';
  return 'file';
};

function createUploader(subfolder = '', options = {}) {
  // Support team-based folder structure for messages
  const useTeamFolders = options.useTeamFolders || false;
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let folderPath;
      
      if (useTeamFolders && req.team_id) {
        // Create team-specific folder: uploads/messages/team_{team_id}/
        folderPath = path.join('uploads', subfolder, `team_${req.team_id}`);
      } else {
        // Use standard folder structure
        folderPath = path.join('uploads', subfolder);
      }

      // Ensure folder exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      cb(null, folderPath);
    },
    filename: (req, file, cb) => {
      const ext = mimeToExtension[file.mimetype] || path.extname(file.originalname) || '.bin';
      const typePrefix = getTypePrefix(file.mimetype);
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);

      cb(null, `${typePrefix}-${timestamp}-${randomString}.${ext}`);
    }
  });

  // File filter function
  const fileFilter = (req, file, cb) => {
    const allowedMimes = Object.keys(mimeToExtension);

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: options.fileSize || Math.max(...Object.values(fileSizeLimits)),
      files: options.files || 10
    }
  });
}

// Middleware for handling multiple files with size validation
const uploadFiles = (subfolder = '', fieldName = 'files', maxCount = 10, options = {}) => {
  return (req, res, next) => {
    const uploadMultiple = createUploader(subfolder, options).array(fieldName, maxCount);

    uploadMultiple(req, res, (err) => {
       if (err instanceof multer.MulterError) {
         let errorMessage = err.message;
         if (err.code === "LIMIT_FILE_SIZE") {
           errorMessage = "File too large. Maximum size depends on file type.";
         }
         if (err.code === "LIMIT_FILE_COUNT") {
           errorMessage = `Too many files. Maximum ${maxCount} files allowed.`;
         }
         return res.status(400).json({
           success: false,
           error: errorMessage,
           message: errorMessage,
         });
       } else if (err) {
         return res.status(400).json({ error: err.message });
       }


      // Validate individual file sizes based on type
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileType = getTypePrefix(file.mimetype);
          const maxSize = fileSizeLimits[fileType] || fileSizeLimits.file;

          if (file.size > maxSize) {
            // Remove uploaded files that exceed size limit
            fs.unlinkSync(file.path);
            return res.status(400).json({
              error: `${file.originalname} exceeds size limit for ${fileType} files (${formatFileSize(maxSize)})`
            });
          }
        }
      }

      next();
    });
  };
};

// Middleware for single file upload with validation
const uploadSingle = (subfolder = '', fieldName = 'file', options = {}) => {
  return (req, res, next) => {
    const uploadSingleFile = createUploader(subfolder, options).single(fieldName);

    uploadSingleFile(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large. Maximum size depends on file type.',
            details: fileSizeLimits
          });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Validate file size based on type
      if (req.file) {
        const fileType = getTypePrefix(req.file.mimetype);
        const maxSize = fileSizeLimits[fileType] || fileSizeLimits.file;

        if (req.file.size > maxSize) {
          // Remove uploaded file that exceeds size limit
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            error: `${req.file.originalname} exceeds size limit for ${fileType} files (${formatFileSize(maxSize)})`
          });
        }
      }

      next();
    });
  };
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  createUploader,
  uploadFiles,
  uploadSingle,
  mimeToExtension,
  getTypePrefix,
  formatFileSize,
  fileSizeLimits
};
