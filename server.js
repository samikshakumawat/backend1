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
// MIDDLEWARE
// ============================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Optional: serve uploads if needed
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================
// API ROUTES
// ============================

app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", imageRoutes);

// ============================
// ROOT ROUTE (for testing)
// ============================

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ============================
// DATABASE CONNECTION
// ============================

const mongoUri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });