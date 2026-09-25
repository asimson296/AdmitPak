const crypto = require("crypto");

function createHash(content) {
    return crypto
        .createHash("sha256")
        .update(content)
        .digest("hex");
}

function detectChange(previousContent, currentContent) {
    const previousHash = createHash(previousContent);
    const currentHash = createHash(currentContent);

    return {
        changed: previousHash !== currentHash,
        previousHash,
        currentHash
    };
}

module.exports = {
    createHash,
    detectChange
};
