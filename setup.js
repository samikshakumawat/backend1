require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

async function setup() {
    await mongoose.connect(process.env.MONGODB_URI);

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