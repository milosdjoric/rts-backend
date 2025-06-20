const multer = require("multer");
const path = require("path");

// Use memory storage for S3 upload
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
};

const gpsFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [".gpx", ".tcx", ".fit"].includes(ext));
};

const imageUpload = multer({ storage, fileFilter: imageFilter });
const gpsUpload = multer({ storage, fileFilter: gpsFilter });

module.exports = {
    imageUpload,
    gpsUpload,
};