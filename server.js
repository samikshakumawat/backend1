const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const dns = require("dns");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const imageRoutes = require("./routes/imageRoutes");
const Product = require("./models/Product");
const Image = require("./models/Image");
const { DEFAULT_IMAGE_PATH, normalizeStoredImagePath } = require("./utils/imagePaths");

const app = express();

// ============================
// MIDDLEWARE
// ============================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/assets", express.static("frontend/assets"));
app.use("/assets", express.static(path.join(__dirname, "..", "frontend", "assets")));

// ============================
// STATIC FILE SERVING (frontend + admin)
// ============================

const frontendDir = path.join(__dirname, "..", "frontend");
const adminDir = path.join(__dirname, "..", "admin");

app.use("/frontend", express.static(frontendDir));
app.use("/admin", express.static(adminDir));

// ============================
// API ROUTES
// ============================

app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", imageRoutes);

// ============================
// ROOT ROUTE - redirect to frontend
// ============================

app.get("/", (_req, res) => {
  res.redirect("/frontend/index.html");
});

// ============================
// DATABASE CONNECTION
// ============================

const mongoUri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;
const preferredDnsServers = ["8.8.8.8", "1.1.1.1"];

// Some networks return timeouts for Atlas SRV lookups on the default resolver.
// Setting public resolvers here keeps mongodb+srv:// URIs working more reliably.
dns.setServers(preferredDnsServers);

function logMongoError(err) {
  console.error("MongoDB connection failed:", err.message);

  if (!mongoUri) {
    console.error("MONGODB_URI is missing in backend1/.env");
    return;
  }

  if (err.message.includes('expected connection string to start with "mongodb://" or "mongodb+srv://"')) {
    console.error("The MongoDB URI format is invalid. Check the MONGODB_URI value in .env.");
    return;
  }

  if (err.message.includes("querySrv ECONNREFUSED")) {
    console.error("Atlas SRV lookup failed. The app is using public DNS resolvers, so check the cluster hostname and Atlas Network Access next.");
    return;
  }

  if (err.message.includes("bad auth") || err.message.includes("Authentication failed")) {
    console.error("MongoDB credentials were rejected. Recheck the Atlas username and password in MONGODB_URI.");
  }
}

async function normalizeExistingImagePaths() {
  let updatedProducts = 0;
  let updatedImages = 0;

  function getValidImagePath(imagePath) {
    const normalized = normalizeStoredImagePath(imagePath);
    if (!normalized) return DEFAULT_IMAGE_PATH;

    if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("data:")) {
      return normalized;
    }

    const cleanPath = normalized.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").replace(/^\/+/, "");

    if (cleanPath.startsWith("uploads/")) {
      return fs.existsSync(path.join(__dirname, cleanPath)) ? cleanPath : DEFAULT_IMAGE_PATH;
    }

    if (cleanPath.startsWith("assets/")) {
      return fs.existsSync(path.join(__dirname, "..", "frontend", cleanPath)) ? cleanPath : DEFAULT_IMAGE_PATH;
    }

    if (cleanPath.startsWith("images/")) {
      const assetPath = `assets/${cleanPath}`;
      return fs.existsSync(path.join(__dirname, "..", "frontend", assetPath)) ? assetPath : DEFAULT_IMAGE_PATH;
    }

    const uploadsPath = `uploads/${cleanPath}`;
    if (fs.existsSync(path.join(__dirname, uploadsPath))) {
      return uploadsPath;
    }

    const assetImagePath = `assets/images/${cleanPath}`;
    if (fs.existsSync(path.join(__dirname, "..", "frontend", assetImagePath))) {
      return assetImagePath;
    }

    return DEFAULT_IMAGE_PATH;
  }

  const products = await Product.find();
  for (const product of products) {
    let changed = false;

    if (product.current) {
      const normalized = getValidImagePath(product.current.image);
      if (normalized !== product.current.image) {
        product.current.image = normalized;
        changed = true;
      }

      if (product.current.categoryIcon) {
        const normalizedIcon = getValidImagePath(product.current.categoryIcon);
        if (normalizedIcon !== product.current.categoryIcon) {
          product.current.categoryIcon = normalizedIcon;
          changed = true;
        }
      }
    }

    if (Array.isArray(product.history)) {
      product.history.forEach((entry) => {
        if (!entry) return;

        const normalized = getValidImagePath(entry.image);
        if (normalized !== entry.image) {
          entry.image = normalized;
          changed = true;
        }

        if (entry.categoryIcon) {
          const normalizedIcon = getValidImagePath(entry.categoryIcon);
          if (normalizedIcon !== entry.categoryIcon) {
            entry.categoryIcon = normalizedIcon;
            changed = true;
          }
        }
      });
    }

    if (changed) {
      await product.save();
      updatedProducts += 1;
    }
  }

  const images = await Image.find();
  for (const image of images) {
    const normalized = getValidImagePath(image.path);
    if (normalized !== image.path) {
      image.path = normalized;
      await image.save();
      updatedImages += 1;
    }
  }

  if (updatedProducts || updatedImages) {
    console.log(`Normalized image paths: ${updatedProducts} products, ${updatedImages} images`);
  }
}

if (!mongoUri) {
  console.error("MONGODB_URI is not set. Add it to backend1/.env before starting the server.");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("MongoDB connected");
    await normalizeExistingImagePaths();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    logMongoError(err);
    process.exit(1);
  });
