const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const Image = require("../models/Image");

const router = express.Router();

router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const imagePath = `uploads/${req.file.filename}`;

    const image = await Image.create({
      filename: req.file.filename,
      path: imagePath
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      imagePath,
      image
    });
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ message: "Image upload failed" });
  }
});

router.get("/images", auth, async (_req, res) => {
  try {
    const images = await Image.find().sort({ uploadedAt: -1 });
    res.json(images);
  } catch (err) {
    console.error("Image list failed:", err);
    res.status(500).json({ message: "Failed to fetch images" });
  }
});

module.exports = router;
