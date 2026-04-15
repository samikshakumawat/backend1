const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  filename: {
    type: String
  },
  path: {
    type: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Image", imageSchema);