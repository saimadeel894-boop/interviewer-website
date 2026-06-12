import path from 'path';
import multer from 'multer';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed'
]);

const isAllowedFile = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return file.mimetype.startsWith('image/') || allowedMimeTypes.has(file.mimetype) || extension === '.zip';
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedFile(file)) {
      return cb(new Error('Only images, PDFs, and ZIP files are allowed'));
    }

    cb(null, true);
  }
});

export default upload;
