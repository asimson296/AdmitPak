const fs = require("fs");
const { createChangeReport } = require("./change-report");

const snapshotDir = "./data/source-snapshots";

const files = fs
    .readdirSync(snapshotDir)
    .filter(file => file.startsWith("1-pdf-") && file.endsWith(".json"))
    .sort();

console.log("Snapshots found:", files.length);

const previousFile = files[0];
const currentFile = files[1];

const previousSnapshot = JSON.parse(
    fs.readFileSync(`${snapshotDir}/${previousFile}`, "utf8")
);

const currentSnapshot = JSON.parse(
    fs.readFileSync(`${snapshotDir}/${currentFile}`, "utf8")
);

previousSnapshot.filePath = `${snapshotDir}/${previousFile}`;
currentSnapshot.filePath = `${snapshotDir}/${currentFile}`;

const report = createChangeReport(
    previousSnapshot,
    currentSnapshot
);

console.log("Previous:", previousFile);
console.log("Current:", currentFile);
console.log("Change detected:", !!report);

if (report) {
    console.log("Review status:", report.report.reviewStatus);
    console.log("Report:", report.filePath);
}
