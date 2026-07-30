const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.join(process.cwd(), env.upload.dir);
const dirs = {
  photos: path.join(uploadRoot, 'photos'),
  logos: path.join(uploadRoot, 'logos'),
  imports: path.join(uploadRoot, 'imports'),
};

Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

function storageFor(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, subdir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });
}

const imageFileFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(ApiError.badRequest('Only image files (jpg, png, webp, gif) are allowed'));
};

const spreadsheetFileFilter = (req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (allowed.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(ApiError.badRequest('Only CSV or Excel files are allowed'));
};

const limits = { fileSize: env.upload.maxFileSizeMb * 1024 * 1024 };

const uploadStudentPhoto = multer({ storage: storageFor(dirs.photos), fileFilter: imageFileFilter, limits });
const uploadSchoolLogo = multer({ storage: storageFor(dirs.logos), fileFilter: imageFileFilter, limits });
const uploadImportFile = multer({ storage: storageFor(dirs.imports), fileFilter: spreadsheetFileFilter, limits });

module.exports = { uploadStudentPhoto, uploadSchoolLogo, uploadImportFile, uploadRoot, dirs };
