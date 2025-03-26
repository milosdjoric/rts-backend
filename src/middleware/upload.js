const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const originalExt = file.originalname.split('.').pop();
        const today = new Date().toISOString().slice(0, 10);
        const random = Math.floor(Math.random() * 10000);
        const filename = `${today}__${random}.${originalExt}`;
        cb(null, filename);
    }
});

const imageFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const gpsFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".gpx", ".tcx", ".fit"].includes(ext)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const imageUpload = multer({storage, fileFilter: imageFilter});
const gpsUpload = multer({storage, fileFilter: gpsFilter});

module.exports = {
    imageUpload,
    gpsUpload,
};