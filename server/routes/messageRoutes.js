
const express = require("express");
const router = express.Router();

const fs = require("fs");
const multer = require("multer");
const path = require("path");

const auth = require("../middleware/authMiddleware");

const {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markConversationMessagesSeen,
  uploadMessage,
  markMessageAsRead,
  forwardMessage,
} = require("../controllers/messageController");

// ================================
// CREATE uploads FOLDER
// ================================

const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ================================
// MULTER STORAGE
// ================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

// ================================
// MULTER CONFIG
// ================================

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// ================================
// ROUTES
// ================================

router.post("/", auth, sendMessage);

router.get("/:conversationId", auth, getMessages);

router.put("/:id", auth, editMessage);

router.put(
  "/conversation/:conversationId/seen",
  auth,
  markConversationMessagesSeen
);

router.delete("/:id", auth, deleteMessage);

router.post(
  "/upload",
  auth,
  upload.single("file"),
  uploadMessage
);

router.post("/:messageId/read", auth, markMessageAsRead);

router.post("/forward", auth, forwardMessage);

module.exports = router;

