const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  title: String,
  shortDescription: String,
  specs: [String],
  price: String,
  image: String,
  categoryIcon: String,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const productSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  current: {
    title: String,
    shortDescription: String,
    specs: [String],
    price: String,
    image: String,
    categoryIcon: String
  },
  history: [historySchema]
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
