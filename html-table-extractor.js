function cleanCell(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function extractHtmlTables(html) {
    const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)];

    return tables.map((tableMatch, tableIndex) => {
        const tableHtml = tableMatch[0];

        const headers = [
            ...tableHtml.matchAll(
                /<th[^>]*>([\s\S]*?)<\/th>/gi
            )
        ].map(match => cleanCell(match[1]));

        const rows = [
            ...tableHtml.matchAll(
                /<tr[\s\S]*?<\/tr>/gi
            )
        ].map(rowMatch => {
            const rowHtml = rowMatch[0];

            if (/<th\b/i.test(rowHtml)) {
                return null;
            }

            return [
                ...rowHtml.matchAll(
                    /<td[^>]*>([\s\S]*?)<\/td>/gi
                )
            ].map(cellMatch => cleanCell(cellMatch[1]));
        }).filter(Boolean);

        const structuredRows = rows.map(row => {
            const result = {
                label: row[0] || ""
            };

            headers.slice(1).forEach((header, index) => {
                result[header] = row[index + 1] || "";
            });

            return result;
        });

        return {
            tableIndex,
            headers,
            rows: structuredRows
        };
    });
}

module.exports = {
    extractHtmlTables
};
