const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const admin = await Admin.findOne({ username: username.trim() });
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login failed:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: "Username and new password are required" });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const admin = await Admin.findOne({ username: String(username).trim() });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.password = await bcrypt.hash(String(newPassword).trim(), 10);
    await admin.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset failed:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
});

module.exports = router;
