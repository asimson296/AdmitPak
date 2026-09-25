// Force reliable DNS servers (fixes TXT record timeouts on some ISPs)
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

/**
 * AdmitPak — MongoDB connection + Mongoose models
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
}

// ---------- Mongoose Models ----------

const userSchema = new mongoose.Schema({
    _id: { type: String },          // custom string ID like "u_abc123"
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String },
    passwordHash: { type: String, required: true },
    tracked: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, versionKey: false });

const feedbackSchema = new mongoose.Schema({
    _id: { type: String },
    category: { type: String },
    message: { type: String, required: true },
    email: { type: String, default: null },
    pageUrl: { type: String, default: null },
    userEmail: { type: String, default: null },
    ip: { type: String },
    status: { type: String, default: "new" },
    submittedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, versionKey: false });

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

// ---------- Connection ----------

async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB Atlas");
        return mongoose;
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        throw err;
    }
}

module.exports = {
    connectToMongoDB,
    User,
    Feedback,
    mongoose
};
