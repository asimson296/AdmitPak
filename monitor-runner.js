const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Some university sites have incomplete SSL chains.
// We only read public pages, so we allow them here.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const { processSource } = require("./source-processor");
const { saveSnapshot } = require("./snapshot-manager");
const { createChangeReport } = require("./change-report");

const CONFIG_FILE = path.join(__dirname, "data", "monitor-config.json");
const SNAPSHOT_DIR = path.join(__dirname, "data", "source-snapshots");

function fetchSource(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https://") ? https : http;
        const request = client.get(
            url,
            { headers: { "User-Agent": "AdmitPak-Monitor/1.0" }, agent: insecureAgent },
            response => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    response.resume();
                    fetchSource(new URL(response.headers.location, url).toString())
                        .then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    response.resume();
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                let data = "";
                response.setEncoding("utf8");
                response.on("data", chunk => { data += chunk; });
                response.on("end", () => resolve(data));
            }
        );
        request.on("error", reject);
    });
}

function safeSlug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getLatestSnapshot(universityId, sourceId) {
    if (!fs.existsSync(SNAPSHOT_DIR)) return null;
    const prefix = `${universityId}-${safeSlug(sourceId)}-`;
    const files = fs.readdirSync(SNAPSHOT_DIR)
        .filter(f => f.startsWith(prefix) && f.endsWith(".json"))
        .sort();
    if (files.length === 0) return null;
    const latestFile = files[files.length - 1];
    const filePath = path.join(SNAPSHOT_DIR, latestFile);
    const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
    snapshot.filePath = filePath;
    return snapshot;
}

async function fetchPdfToFile(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https://") ? https : http;
        const tmpPath = path.join("/tmp", "admitpak-pdf-" + Date.now() + ".pdf");
        const file = fs.createWriteStream(tmpPath);

        const request = client.get(
            url,
            { headers: { "User-Agent": "AdmitPak-Monitor/1.0" }, agent: insecureAgent },
            response => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    response.resume();
                    file.close();
                    fs.unlinkSync(tmpPath);
                    fetchPdfToFile(new URL(response.headers.location, url).toString())
                        .then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    response.resume();
                    file.close();
                    fs.unlinkSync(tmpPath);
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve(tmpPath);
                });
            }
        );
        request.on("error", err => {
            file.close();
            try { fs.unlinkSync(tmpPath); } catch {}
            reject(err);
        });
    });
}

function applyIgnorePatterns(content, patterns) {
    if (!Array.isArray(patterns) || patterns.length === 0) return content;
    let cleaned = content;
    for (const pattern of patterns) {
        try {
            const re = new RegExp(pattern, "gi");
            cleaned = cleaned.replace(re, " ");
        } catch (err) {
            console.warn("⚠️  Bad ignore pattern:", pattern, "—", err.message);
        }
    }
    return cleaned.replace(/\s+/g, " ").trim();
}

async function monitorSource(university, source) {
    const result = {
        university: university.universityName,
        sourceName: source.name,
        url: source.url,
        status: "unknown",
        reportPath: null,
        error: null
    };

    try {
        let processed;

        if (source.type === "pdf") {
            const tmpPath = await fetchPdfToFile(source.url);
            try {
                processed = processSource("pdf", tmpPath);
            } finally {
                try { fs.unlinkSync(tmpPath); } catch {}
            }
        } else {
            const rawSource = await fetchSource(source.url);
            processed = processSource(source.type, rawSource);
        }

        // Apply per-source ignore patterns to strip noise (view counters, dates, etc.)
        if (source.ignorePatterns) {
            processed.content = applyIgnorePatterns(processed.content, source.ignorePatterns);
        }

        const previousSnapshot = getLatestSnapshot(university.universityId, source.id);

        const saved = saveSnapshot({
            universityId: university.universityId,
            universityName: university.universityName,
            sourceId: source.id,
            sourceUrl: source.url,
            sourceType: source.type,
            ...processed
        });

        if (!previousSnapshot) {
            result.status = "baseline";
            return result;
        }

        const currentSnapshot = saved.snapshot;
        currentSnapshot.filePath = saved.filePath;

        const report = createChangeReport(previousSnapshot, currentSnapshot);

        if (!report) {
            result.status = "no-change";
            return result;
        }

        result.status = "changed";
        result.reportPath = report.filePath;
        return result;

    } catch (error) {
        result.status = "error";
        result.error = error.message;
        return result;
    }
}

async function runMonitoring() {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));

    if (!config.monitoring.enabled) {
        console.log("Monitoring is disabled.");
        return;
    }

    const startedAt = new Date();
    console.log("");
    console.log("📋  AdmitPak Monitor — " + startedAt.toISOString().slice(0, 10));
    console.log("═".repeat(64));
    console.log("");

    const results = [];
    let changeCount = 0;
    let errorCount = 0;
    let baselineCount = 0;

    for (const university of config.universities || []) {
        console.log("🏛️  " + university.universityName);

        for (const source of university.sources || []) {
            if (!source.enabled) continue;

            const result = await monitorSource(university, source);
            results.push(result);

            if (result.status === "no-change") {
                console.log("   ✅ " + padEnd(source.name, 32) + "No change");
            } else if (result.status === "changed") {
                console.log("   ⚠️  " + padEnd(source.name, 32) + "CHANGE DETECTED");
                console.log("        → " + source.url);
                console.log("        → Report: " + result.reportPath);
                changeCount++;
            } else if (result.status === "baseline") {
                console.log("   📌 " + padEnd(source.name, 32) + "Baseline created");
                baselineCount++;
            } else {
                console.log("   ❌ " + padEnd(source.name, 32) + "Error: " + result.error);
                errorCount++;
            }
        }

        console.log("");
    }

    console.log("═".repeat(64));
    console.log("📊  Summary");
    console.log("   Total pages checked : " + results.length);
    console.log("   No change           : " + (results.length - changeCount - errorCount - baselineCount));
    console.log("   Changes detected    : " + changeCount);
    console.log("   Baselines created   : " + baselineCount);
    console.log("   Errors              : " + errorCount);
    console.log("═".repeat(64));
    console.log("");

    if (changeCount > 0) {
        console.log("🔎  Changed pages (review these):");
        results
            .filter(r => r.status === "changed")
            .forEach(r => {
                console.log("");
                console.log("   " + r.university + " — " + r.sourceName);
                console.log("   Official page: " + r.url);
                console.log("   Report file  : " + r.reportPath);
            });
        console.log("");
    }
}

function padEnd(str, len) {
    str = String(str);
    if (str.length >= len) return str.slice(0, len - 2) + "..";
    return str + " ".repeat(len - str.length);
}

if (require.main === module) {
    runMonitoring().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    fetchSource,
    getLatestSnapshot,
    monitorSource,
    runMonitoring
};
