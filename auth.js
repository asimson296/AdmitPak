/**
 * AdmitPak — Auth helpers
 * Password hashing, JWT issuance/verification, user file I/O.
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const USERS_FILE = path.join(__dirname, "data", "users.json");
const COOKIE_NAME = "admitpak_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const TOKEN_EXPIRY = "7d";

// ---------- User file I/O ----------

function readUsers() {
    try {
        const raw = fs.readFileSync(USERS_FILE, "utf8");
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findUserByEmail(email) {
    const lower = String(email).toLowerCase().trim();
    return readUsers().find(u => u.email === lower) || null;
}

function findUserById(id) {
    return readUsers().find(u => u.id === id) || null;
}

function createUser({ email, password, name }) {
    const users = readUsers();
    const lower = String(email).toLowerCase().trim();

    if (users.some(u => u.email === lower)) {
        throw new Error("EMAIL_TAKEN");
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const user = {
        id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        email: lower,
        name: name || lower.split("@")[0],
        passwordHash,
        tracked: [],
        createdAt: new Date().toISOString(),
    };

    users.push(user);
    writeUsers(users);
    return user;
}

// ---------- Password ----------

function verifyPassword(plain, hash) {
    return bcrypt.compareSync(plain, hash);
}

// ---------- JWT ----------

function issueToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
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

// ---------- Public representation (never expose hash) ----------

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        tracked: user.tracked || [],
    };
}

module.exports = {
    COOKIE_NAME,
    readUsers,
    writeUsers,
    findUserByEmail,
    findUserById,
    createUser,
    verifyPassword,
    issueToken,
    verifyToken,
    publicUser,
};
