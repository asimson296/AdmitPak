const fs = require("fs");
const path = require("path");
const { detectChange } = require("./source-monitor");
const { detectFieldChanges } = require("./field-change-detector");
const {
    detectTableChanges,
    getTableKey
} = require("./table-change-detector");

const REPORT_DIR = path.join(
    __dirname,
    "data",
    "change-reports"
);

function createChangeReport(previousSnapshot, currentSnapshot) {
    const comparison = detectChange(
        previousSnapshot.content,
        currentSnapshot.content
    );

    if (!comparison.changed) {
        return null;
    }

    const fieldChanges = detectFieldChanges(
        previousSnapshot.content,
        currentSnapshot.content
    );

    let tableChanges = [];

    const previousTables =
        previousSnapshot.structuredData?.tables || [];

    const currentTables =
        currentSnapshot.structuredData?.tables || [];

    const previousTableMap = new Map(
        previousTables.map(table => [
            getTableKey(table),
            table
        ])
    );

    const currentTableMap = new Map(
        currentTables.map(table => [
            getTableKey(table),
            table
        ])
    );

    for (const [tableKey, currentTable] of currentTableMap) {
        const previousTable = previousTableMap.get(tableKey);

        if (!previousTable) {
            tableChanges.push({
                type: "table-added",
                tableKey
            });
            continue;
        }

        tableChanges.push(
            ...detectTableChanges(
                previousTable,
                currentTable
            ).map(change => ({
                tableKey,
                ...change
            }))
        );
    }

    for (const tableKey of previousTableMap.keys()) {
        if (!currentTableMap.has(tableKey)) {
            tableChanges.push({
                type: "table-removed",
                tableKey
            });
        }
    }

    fs.mkdirSync(REPORT_DIR, { recursive: true });

    const report = {
        universityId: currentSnapshot.universityId,
        universityName: currentSnapshot.universityName,
        sourceUrl: currentSnapshot.sourceUrl,
        sourceType: currentSnapshot.sourceType,
        detectedAt: new Date().toISOString(),

        previousSnapshot: previousSnapshot.filePath || null,
        currentSnapshot: currentSnapshot.filePath || null,

        previousContentHash: comparison.previousHash,
        currentContentHash: comparison.currentHash,

        changeStatus: "changed",
        reviewStatus: "pending",

        fieldChanges,
        tableChanges,

        evidence: {
            previousContent: previousSnapshot.content,
            currentContent: currentSnapshot.content
        },

        verification: {
            verifiedBy: null,
            verifiedAt: null,
            decision: null,
            notes: null
        }
    };

    const filename =
        `${currentSnapshot.universityId}-change-${Date.now()}.json`;

    const filePath = path.join(REPORT_DIR, filename);

    fs.writeFileSync(
        filePath,
        JSON.stringify(report, null, 2)
    );

    return {
        filePath,
        report
    };
}

module.exports = {
    createChangeReport
};
