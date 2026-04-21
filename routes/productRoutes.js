const express = require("express");
const Product = require("../models/Product");
const {
  normalizeStoredImagePath,
  serializeProductForResponse
} = require("../utils/imagePaths");

const router = express.Router();
const CATEGORY_SORT_DESC = { createdAt: -1, _id: -1 };
const CATEGORY_SORT_ASC = { createdAt: 1, _id: 1 };
let categoryIndexChecked = false;

async function ensureCategoryIsNotUnique() {
  if (categoryIndexChecked) {
    return;
  }

  try {
    const indexes = await Product.collection.indexes();
    const uniqueCategoryIndex = indexes.find(
      (index) => index.unique && index.key && index.key.category === 1
    );

    if (uniqueCategoryIndex && uniqueCategoryIndex.name) {
      await Product.collection.dropIndex(uniqueCategoryIndex.name);
      console.log(`Dropped legacy unique index: ${uniqueCategoryIndex.name}`);
    }
  } catch (err) {
    // Ignore missing-index race conditions and continue normal flow.
    if (!(err && err.codeName === "IndexNotFound")) {
      console.error("Category index check failed:", err);
    }
  } finally {
    categoryIndexChecked = true;
  }
}

function getCurrentPayload(body = {}) {
  const source = body.current && typeof body.current === "object" ? body.current : body;
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(source, "title")) {
    payload.title = source.title || "";
  }
  if (Object.prototype.hasOwnProperty.call(source, "shortDescription")) {
    payload.shortDescription = source.shortDescription || "";
  }
  if (Object.prototype.hasOwnProperty.call(source, "specs")) {
    payload.specs = Array.isArray(source.specs) ? source.specs : [];
  }
  if (Object.prototype.hasOwnProperty.call(source, "price")) {
    payload.price = source.price || "";
  }
  if (Object.prototype.hasOwnProperty.call(source, "image")) {
    payload.image = normalizeStoredImagePath(source.image || "");
  }
  if (Object.prototype.hasOwnProperty.call(source, "categoryIcon")) {
    payload.categoryIcon = source.categoryIcon || "";
  }

  return payload;
}

function pushHistory(product) {
  product.history.push({
    title: product.current?.title || "",
    shortDescription: product.current?.shortDescription || "",
    specs: Array.isArray(product.current?.specs) ? product.current.specs : [],
    price: product.current?.price || "",
    image: product.current?.image || "",
    categoryIcon: product.current?.categoryIcon || "",
    updatedAt: new Date()
  });
}

router.get("/", async (_req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, createdAt: -1 });
    res.json(products.map((product) => serializeProductForResponse(_req, product)));
  } catch (err) {
    console.error("Fetch products failed:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureCategoryIsNotUnique();

    const category = String(req.body.category || "").trim();
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const product = await Product.create({
      category,
      current: {
        title: "",
        shortDescription: "",
        specs: [],
        price: "",
        image: "",
        categoryIcon: "",
        ...getCurrentPayload(req.body)
      },
      history: []
    });

    res.status(201).json(serializeProductForResponse(req, product));
  } catch (err) {
    console.error("Create product failed:", err);
    res.status(500).json({ message: "Create failed" });
  }
});

router.get("/category/:category/all", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category }).sort(CATEGORY_SORT_ASC);
    res.json(products.map((product) => serializeProductForResponse(req, product)));
  } catch (err) {
    console.error("Fetch category products failed:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

router.get("/category/:category", async (req, res) => {
  try {
    const product = await Product.findOne({ category: req.params.category }).sort(CATEGORY_SORT_DESC);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(serializeProductForResponse(req, product));
  } catch (err) {
    console.error("Fetch category product failed:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
});

router.get("/item/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(serializeProductForResponse(req, product));
  } catch (err) {
    console.error("Fetch product by id failed:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
});

router.put("/item/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    pushHistory(product);
    product.current = { ...product.current, ...getCurrentPayload(req.body) };
    await product.save();

    res.json({
      message: "Product updated successfully",
      product: serializeProductForResponse(req, product)
    });
  } catch (err) {
    console.error("Update product by id failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

router.delete("/item/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product by id failed:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

// Legacy category update route: updates latest product inside that category.
router.put("/:category", async (req, res) => {
  try {
    const product = await Product.findOne({ category: req.params.category }).sort(CATEGORY_SORT_DESC);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    pushHistory(product);
    product.current = { ...product.current, ...getCurrentPayload(req.body) };
    await product.save();

    res.json({
      message: "Product updated successfully",
      product: serializeProductForResponse(req, product)
    });
  } catch (err) {
    console.error("Update product failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// Legacy category delete route: deletes latest product inside that category.
router.delete("/:category", async (req, res) => {
  try {
    const latest = await Product.findOne({ category: req.params.category }).sort(CATEGORY_SORT_DESC);
    if (!latest) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(latest._id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product failed:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
