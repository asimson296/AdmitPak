function getTableKey(table) {
    const headers = (table.headers || [])
        .map(header => String(header).trim().toLowerCase());

    const labels = (table.rows || [])
        .slice(0, 3)
        .map(row => String(row.label || "").trim().toLowerCase());

    return [...headers, ...labels].join(" | ");
}

function detectTableChanges(previousTable, currentTable) {
    const changes = [];

    if (!previousTable || !currentTable) {
        return changes;
    }

    const headers = currentTable.headers || [];

    const previousTableKey = getTableKey(previousTable);
    const currentTableKey = getTableKey(currentTable);

    if (
        previousTableKey &&
        currentTableKey &&
        previousTableKey !== currentTableKey
    ) {
        return [{
            type: "table-identity-changed",
            previousTableKey,
            currentTableKey
        }];
    }

    const previousRows = indexRows(previousTable.rows || []);
    const currentRows = indexRows(currentTable.rows || []);

    for (const label of Object.keys(currentRows)) {
        const previousRow = previousRows[label];
        const currentRow = currentRows[label];

        if (!previousRow) {
            changes.push({
                type: "row-added",
                label,
                current: currentRow
            });
            continue;
        }

        for (const header of headers.slice(1)) {
            const previousValue = previousRow[header] || "";
            const currentValue = currentRow[header] || "";

            if (previousValue !== currentValue) {
                changes.push({
                    type: "cell-changed",
                    label,
                    column: header,
                    previousValue,
                    currentValue
                });
            }
        }
    }

    for (const label of Object.keys(previousRows)) {
        if (!currentRows[label]) {
            changes.push({
                type: "row-removed",
                label,
                previous: previousRows[label]
            });
        }
    }

    return changes;
}

function indexRows(rows) {
    const result = {};

    for (const row of rows) {
        if (row.label) {
            result[row.label] = row;
        }
    }

    return result;
}

module.exports = {
    detectTableChanges,
    getTableKey
};
