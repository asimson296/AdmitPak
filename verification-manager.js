const fs = require("fs");
const path = require("path");

function reviewChangeReport(reportPath, decision, admin, notes = "") {
    const allowedDecisions = [
        "verified",
        "rejected",
        "pending"
    ];

    if (!allowedDecisions.includes(decision)) {
        throw new Error(
            `Invalid decision. Use: ${allowedDecisions.join(", ")}`
        );
    }

    const report = JSON.parse(
        fs.readFileSync(reportPath, "utf8")
    );

    report.reviewStatus = decision;

    report.verification = {
        verifiedBy: admin || null,
        verifiedAt: new Date().toISOString(),
        decision,
        notes
    };

    fs.writeFileSync(
        reportPath,
        JSON.stringify(report, null, 2)
    );

    return report;
}

module.exports = {
    reviewChangeReport
};
