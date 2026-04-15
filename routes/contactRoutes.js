const express = require("express");
const Contact = require("../models/Contact");
const auth = require("../middleware/auth");

const router = express.Router();

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || pass === "YOUR_16_DIGIT_APP_PASSWORD") {
    return null;
  }

  try {
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  } catch {
    return null;
  }
}

async function notifyAdmin(contactDoc) {
  const transporter = getTransporter();
  const to = process.env.CONTACT_NOTIFY_TO || process.env.EMAIL_USER;

  if (!transporter || !to) return;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `New contact message from ${contactDoc.name}`,
    text: [
      "A new contact message was submitted.",
      `Name: ${contactDoc.name}`,
      `Email: ${contactDoc.email}`,
      `Phone: ${contactDoc.phone}`,
      "",
      "Message:",
      contactDoc.message
    ].join("\n")
  });
}

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const contact = await Contact.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      message: String(message).trim(),
      status: "New"
    });

    notifyAdmin(contact).catch((err) => {
      console.error("Contact email notification failed:", err.message);
    });

    res.status(201).json({ message: "Message saved successfully", contact });
  } catch (err) {
    console.error("Contact create failed:", err);
    res.status(500).json({ message: "Failed to save message" });
  }
});

router.get("/", auth, async (_req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error("Contact list failed:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.patch("/:id/status", auth, async (req, res) => {
  try {
    const validStatuses = ["New", "Read", "Contacted"];
    const { status } = req.body;

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Status updated", contact: updated });
  } catch (err) {
    console.error("Contact status update failed:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Contact delete failed:", err);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

module.exports = router;
