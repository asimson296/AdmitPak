const {
    extractHtmlText,
    extractPdfText,
    extractImageText,
    extractPdfWithOcr
} = require("./source-extractor");

const {
    extractHtmlTables
} = require("./html-table-extractor");

function processSource(type, input) {
    switch (type) {
        case "html": {
            const text = extractHtmlText(input);
            const tables = extractHtmlTables(input);

            return {
                content: text,
                extractionMethod: "html-text",
                structuredData: {
                    tables
                }
            };
        }

        case "pdf":
            return {
                content: extractPdfText(input),
                extractionMethod: "pdftotext",
                structuredData: null
            };

        case "image":
            return {
                content: extractImageText(input),
                extractionMethod: "tesseract-ocr",
                structuredData: null
            };

        case "scanned-pdf":
            return {
                content: extractPdfWithOcr(input),
                extractionMethod: "pdf-to-image-ocr",
                structuredData: null
            };

        default:
            throw new Error(`Unsupported source type: ${type}`);
    }
}

module.exports = {
    processSource
};
