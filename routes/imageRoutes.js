const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const Image = require("../models/Image");
const {
  buildPublicFileUrl,
  getUploadRelativePath,
  serializeImageForResponse
} = require("../utils/imagePaths");

const router = express.Router();

router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const imagePath = getUploadRelativePath(req.file.filename);

    const image = await Image.create({
      filename: req.file.filename,
      path: imagePath
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      imagePath,
      imageUrl: buildPublicFileUrl(req, imagePath),
      image: serializeImageForResponse(req, image)
    });
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ message: "Image upload failed" });
  }
});

router.get("/images", auth, async (req, res) => {
  try {
    const images = await Image.find().sort({ uploadedAt: -1 });
    res.json(images.map((image) => serializeImageForResponse(req, image)));
  } catch (err) {
    console.error("Image list failed:", err);
    res.status(500).json({ message: "Failed to fetch images" });
  }
});

module.exports = router;
