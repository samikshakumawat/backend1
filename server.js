const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const dns = require("dns");
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

app.get("/", (_req, res) => {
  res.send("API is running");
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

if (!mongoUri) {
  console.error("MONGODB_URI is not set. Add it to backend1/.env before starting the server.");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    logMongoError(err);
    process.exit(1);
  });
