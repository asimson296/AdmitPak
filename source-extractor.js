const fs = require("fs");
const { execFileSync } = require("child_process");

function extractHtmlText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractPdfText(filePath) {
    return execFileSync("pdftotext", ["-layout", filePath, "-"], {
        encoding: "utf8"
    }).trim();
}

function extractImageText(filePath) {
    return execFileSync("tesseract", [filePath, "stdout"], {
        encoding: "utf8"
    }).trim();
}

function extractPdfWithOcr(filePath) {
    const outputPrefix = `/tmp/admitroute-ocr-${Date.now()}`;

    execFileSync("pdftoppm", [
        "-jpeg",
        "-r",
        "200",
        filePath,
        outputPrefix
    ]);

    const files = fs.readdirSync("/tmp")
        .filter(file => file.startsWith(outputPrefix.split("/").pop()));

    let text = "";

    for (const file of files) {
        const imagePath = `/tmp/${file}`;

        text += "\n" + extractImageText(imagePath);

        fs.unlinkSync(imagePath);
    }

    return text.trim();
}

module.exports = {
    extractHtmlText,
    extractPdfText,
    extractImageText,
    extractPdfWithOcr
};
