require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");

const auth = require("./auth");
const { connectToMongoDB, Feedback } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests
app.use(express.json());
app.use(cookieParser());

// ============================================
// PRE-RENDER universities.html for SEO
// ============================================

app.get("/universities.html", (req, res, next) => {
    try {
        const htmlPath = path.join(__dirname, "public", "universities.html");
        const dataPath = path.join(__dirname, "data", "universities.json");
        let html = fs.readFileSync(htmlPath, "utf8");
        const unis = JSON.parse(fs.readFileSync(dataPath, "utf8"));

        const cards = unis.map(u => {
            const status = (u.admission && u.admission.status) ? u.admission.status.toLowerCase() : "unknown";
            let statusLabel = "Not Verified";
            if (status === "open") statusLabel = "Open";
            else if (status === "closed") statusLabel = "Closed";
            else if (status === "not-announced") statusLabel = "Not Announced";

            const programCount = (u.programs && u.programs.length) ? u.programs.length : 0;
            const city = u.city || "Pakistan";

            return '<article class="university-card">' +
                '<div class="university-card-body">' +
                '<h3><a href="/university.html?slug=' + u.slug + '">' + u.name + '</a></h3>' +
                '<p class="university-card-location">' + city + '</p>' +
                '<div class="university-card-stats">' +
                '<div class="card-stat"><span>Programs</span><strong>' + programCount + '</strong></div>' +
                '<div class="card-stat"><span>Status</span><strong>' + statusLabel + '</strong></div>' +
                '</div>' +
                '<a href="/university.html?slug=' + u.slug + '" class="btn btn-primary university-card-link">View Details</a>' +
                '</div>' +
                '</article>';
        }).join("");

        const marker = '<div id="universities-page-list" class="universities-page-grid">';
        const markerIdx = html.indexOf(marker);

        if (markerIdx === -1) {
            console.error("Pre-render: marker not found");
            return next();
        }

        const insertAt = markerIdx + marker.length;
        html = html.slice(0, insertAt) + cards + html.slice(insertAt);

        res.setHeader("Content-Type", "text/html");
        res.send(html);
    } catch (err) {
        console.error("Pre-render error:", err.message);
        next();
    }
});

// Serve frontend files (with no-cache for HTML/JS/CSS during development)
app.use(express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        if (/\.(html|js|css)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
        }
    }
}));

// API: Get universities
app.get("/api/universities", (req, res) => {
    try {
        const dataPath = path.join(__dirname, "data", "universities.json");
        const universities = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        res.json(universities);
    } catch (error) {
        res.status(500).json({
            error: "Unable to load university data"
        });
    }
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

async function requireAuth(req, res, next) {
    const token = req.cookies[auth.COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "NOT_LOGGED_IN" });

    const payload = auth.verifyToken(token);
    if (!payload) {
        res.clearCookie(auth.COOKIE_NAME);
        return res.status(401).json({ error: "SESSION_EXPIRED" });
    }
    const user = await auth.findUserById(payload.userId);
    if (!user) {
        res.clearCookie(auth.COOKIE_NAME);
        return res.status(401).json({ error: "USER_NOT_FOUND" });
    }
    req.user = user;
    next();
}

async function optionalAuth(req, _res, next) {
    const token = req.cookies[auth.COOKIE_NAME];
    if (token) {
        const payload = auth.verifyToken(token);
        if (payload) {
            const user = await auth.findUserById(payload.userId);
            if (user) req.user = user;
        }
    }
    next();
}

// ============================================
// RATE LIMITING (login/signup brute-force protection)
// ============================================

const AUTH_RATE = new Map(); // IP -> [timestamps]

function rateLimitAuth(limitPerMinute = 10) {
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || "unknown";
        const now = Date.now();
        const minuteAgo = now - 60 * 1000;

        const times = (AUTH_RATE.get(ip) || []).filter(t => t > minuteAgo);

        if (times.length >= limitPerMinute) {
            return res.status(429).json({
                error: "Too many attempts. Please wait a minute and try again."
            });
        }

        times.push(now);
        AUTH_RATE.set(ip, times);
        next();
    };
}

// ============================================
// AUTH ROUTES
// ============================================

app.post("/api/signup", rateLimitAuth(5), async (req, res) => {
    try {
        const { email, password, name } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        const user = await auth.createUser({ email, password, name });
        const token = auth.issueToken(user);

        res.cookie(auth.COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ user: auth.publicUser(user) });
    } catch (error) {
        if (error.message === "EMAIL_TAKEN") {
            return res.status(409).json({ error: "An account with this email already exists." });
        }
        console.error("Signup error:", error);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});

app.post("/api/login", rateLimitAuth(10), async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const user = await auth.findUserByEmail(email);
        if (!user || !auth.verifyPassword(password, user.passwordHash)) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = auth.issueToken(user);
        res.cookie(auth.COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ user: auth.publicUser(user) });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});

app.post("/api/logout", (req, res) => {
    res.clearCookie(auth.COOKIE_NAME);
    res.json({ ok: true });
});

app.get("/api/me", optionalAuth, (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: auth.publicUser(req.user) });
});

// ============================================
// TRACKING ROUTES (auth required)
// ============================================

app.get("/api/tracked", requireAuth, (req, res) => {
    res.json({ tracked: req.user.tracked || [] });
});

app.post("/api/track/:slug", requireAuth, async (req, res) => {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "Missing slug" });

    const updated = await auth.addTracked(req.user._id || req.user.id, slug);
    if (!updated) return res.status(401).json({ error: "USER_NOT_FOUND" });

    res.json({ tracked: updated.tracked || [] });
});

app.delete("/api/track/:slug", requireAuth, async (req, res) => {
    const slug = String(req.params.slug || "").trim();
    const updated = await auth.removeTracked(req.user._id || req.user.id, slug);
    if (!updated) return res.status(401).json({ error: "USER_NOT_FOUND" });

    res.json({ tracked: updated.tracked || [] });
});

// ============================================
// FEEDBACK (anonymous allowed)
// ============================================

const FEEDBACK_DIR = path.join(__dirname, "data", "feedback");
const FEEDBACK_RATE = new Map(); // IP -> [timestamps]

function ensureFeedbackDir() {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

function readFeedback() {
    ensureFeedbackDir();
    try {
        const files = fs.readdirSync(FEEDBACK_DIR).filter(f => f.endsWith(".json"));
        return files.map(f => {
            try {
                return JSON.parse(fs.readFileSync(path.join(FEEDBACK_DIR, f), "utf8"));
            } catch { return null; }
        }).filter(Boolean);
    } catch {
        return [];
    }
}

function saveFeedbackEntry(entry) {
    ensureFeedbackDir();
    const filePath = path.join(FEEDBACK_DIR, entry.id + ".json");
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
    return filePath;
}

function rateLimited(ip) {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const times = (FEEDBACK_RATE.get(ip) || []).filter(t => t > hourAgo);
    if (times.length >= 5) return true;
    times.push(now);
    FEEDBACK_RATE.set(ip, times);
    return false;
}

app.post("/api/feedback", async (req, res) => {
    try {
        const ip = req.ip || req.connection?.remoteAddress || "unknown";

        if (rateLimited(ip)) {
            return res.status(429).json({ error: "Too many submissions. Please try again later." });
        }

        const { category, message, email } = req.body || {};

        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: "Please write a message." });
        }
        if (String(message).length > 3000) {
            return res.status(400).json({ error: "Message too long (max 3000 characters)." });
        }

        const entry = {
            _id: "fb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            category: category || "general",
            message: String(message).trim(),
            email: email ? String(email).trim().toLowerCase() : null,
            pageUrl: req.body.pageUrl || null,
            userEmail: req.user ? req.user.email : null,
            ip,
            submittedAt: new Date().toISOString(),
            status: "new"
        };

        await Feedback.create(entry);

        console.log("📬 New feedback saved:", entry._id);
        console.log("   Category:", entry.category);
        console.log("   Message:", entry.message.slice(0, 60));

        res.json({ ok: true, id: entry._id });
    } catch (error) {
        console.error("Feedback error:", error);
        res.status(500).json({ error: "Could not save feedback. Please try again." });
    }
});

app.get("/api/feedback/count", requireAuth, async (req, res) => {
    const count = await Feedback.countDocuments({ status: "new" });
    res.json({ count });
});

// Start server
connectToMongoDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`AdmitPak is running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    });
