const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/anuncios");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nome = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nome);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Arquivo inválido. Envie apenas imagens."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024 // 5MB por imagem
  }
});

module.exports = upload;