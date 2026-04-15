const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const imageRoutes = require("./routes/imageRoutes");

const app = express();

// ============================
// FRONTEND STATIC CONFIG
// ============================

const frontendDir = path.join(__dirname, "..", "frontend");

const adminLegacyDir = path.join(
  __dirname,
  "..",
  "admin",
  "Eazy_solution_project",
  "Eazy_solutions_website"
);

const frontendAdminDir = path.join(frontendDir, "admin");
const frontendUserDir = path.join(frontendDir, "user");
const frontendAssetsDir = path.join(frontendDir, "assets");

const noCacheStaticOptions = {
  setHeaders: (res, filePath) => {
    if (/\.(html|css|js)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  }
};

// ============================
// MIDDLEWARE
// ============================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(frontendAssetsDir, noCacheStaticOptions));
app.use("/user", express.static(frontendUserDir, noCacheStaticOptions));
app.use("/admin", express.static(adminLegacyDir, noCacheStaticOptions));
app.use("/admin", express.static(frontendAdminDir, noCacheStaticOptions));

// ============================
// API ROUTES
// ============================

app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", imageRoutes);

// Serve frontend
app.use(express.static(frontendDir, noCacheStaticOptions));

// ============================
// DATABASE CONNECTION
// ============================

const mongoUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 5000;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Home page: http://localhost:${port}/`);
      console.log(`Admin page: http://localhost:${port}/admin/admin-login.html`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });
