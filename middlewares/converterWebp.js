const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

async function converterArquivo(file) {
  if (!file.path || file.mimetype === 'image/webp') return;
  if (file.fieldname === 'favicon') return;

  const webpFilename = file.filename.replace(/\.[^.]+$/, '.webp');
  const webpPath = path.join(path.dirname(file.path), webpFilename);

  await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
  await fs.unlink(file.path);

  file.filename = webpFilename;
  file.path = webpPath;
  file.mimetype = 'image/webp';
}

async function converterWebp(req, res, next) {
  try {
    // upload.single() → req.file
    if (req.file) {
      await converterArquivo(req.file);
    }

    // upload.array() ou upload.fields() → req.files
    if (req.files) {
      const lista = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();
      for (const file of lista) {
        await converterArquivo(file);
      }
    }

    next();
  } catch (err) {
    console.error('Erro ao converter imagem para WebP:', err);
    next();
  }
}

module.exports = converterWebp;
