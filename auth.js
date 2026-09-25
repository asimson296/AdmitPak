/**
 * AdmitPak — Auth helpers (MongoDB-backed)
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("./db");

const COOKIE_NAME = "admitpak_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const TOKEN_EXPIRY = "7d";

// ---------- Users ----------

async function findUserByEmail(email) {
    const lower = String(email).toLowerCase().trim();
    return await User.findOne({ email: lower }).lean();
}

async function findUserById(id) {
    return await User.findById(id).lean();
}

async function createUser({ email, password, name }) {
    const lower = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: lower }).lean();
    if (existing) throw new Error("EMAIL_TAKEN");

    const passwordHash = bcrypt.hashSync(password, 10);

    const user = await User.create({
        _id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        email: lower,
        name: name || lower.split("@")[0],
        passwordHash,
        tracked: []
    });

    return user.toObject();
}

async function addTracked(userId, slug) {
    await User.updateOne(
        { _id: userId },
        { $addToSet: { tracked: slug } }
    );
    return await findUserById(userId);
}

async function removeTracked(userId, slug) {
    await User.updateOne(
        { _id: userId },
        { $pull: { tracked: slug } }
    );
    return await findUserById(userId);
}

// ---------- Password ----------

function verifyPassword(plain, hash) {
    return bcrypt.compareSync(plain, hash);
}

// ---------- JWT ----------

function issueToken(user) {
    return jwt.sign(
        { userId: user._id || user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// ---------- Public representation ----------

function publicUser(user) {
    return {
        id: user._id || user.id,
        email: user.email,
        name: user.name,
        tracked: user.tracked || []
    };
}

module.exports = {
    COOKIE_NAME,
    findUserByEmail,
    findUserById,
    createUser,
    addTracked,
    removeTracked,
    verifyPassword,
    issueToken,
    verifyToken,
    publicUser
};
