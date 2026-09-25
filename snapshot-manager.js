const fs = require("fs");
const path = require("path");
const { createHash } = require("./source-monitor");

const SNAPSHOT_DIR = path.join(__dirname, "data", "source-snapshots");

function ensureSnapshotDirectory() {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

function safeSlug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function saveSnapshot({
    universityId,
    universityName,
    sourceId,
    sourceUrl,
    sourceType,
    content,
    extractionMethod,
    structuredData = null
}) {
    ensureSnapshotDirectory();

    const timestamp = new Date().toISOString();
    const hash = createHash(content);

    const snapshot = {
        universityId,
        universityName,
        sourceId,
        sourceUrl,
        sourceType,
        retrievedAt: timestamp,
        contentHash: hash,
        extractionMethod,
        content,
        structuredData
    };

    const safeName = `${universityId}-${safeSlug(sourceId || sourceType)}-${Date.now()}.json`;
    const filePath = path.join(SNAPSHOT_DIR, safeName);

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

    return { filePath, snapshot };
}

module.exports = { saveSnapshot };
