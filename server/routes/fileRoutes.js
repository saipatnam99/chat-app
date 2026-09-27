const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.get("/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(__dirname, "../uploads", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  res.download(filePath);
});

module.exports = router;