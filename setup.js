require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

async function setup() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("MONGODB_URI is missing in backend1/.env");
    process.exit(1);
  }

  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    await mongoose.connect(mongoUri);
  } catch (err) {
    console.error("MongoDB setup connection failed:", err.message);

    if (err.message.includes("querySrv ECONNREFUSED")) {
      console.error("Atlas SRV lookup failed. Verify the cluster hostname, Atlas Network Access, and local DNS/network access.");
    }

    process.exit(1);
  }

  const existing = await Admin.findOne({
    username: process.env.ADMIN_USERNAME
  });

  if (existing) {
    console.log("Admin already exists");
    process.exit();
  }

  const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  await Admin.create({
    username: process.env.ADMIN_USERNAME,
    password: hashed
  });

  console.log("Admin created successfully");
  process.exit();
}

setup();
