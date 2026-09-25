const fs = require("fs");
const path = require("path");

const UNIVERSITY_FILE = path.join(
    __dirname,
    "data",
    "universities.json"
);

function applyVerifiedChange(reportPath) {
    const report = JSON.parse(
        fs.readFileSync(reportPath, "utf8")
    );

    if (report.reviewStatus !== "verified") {
        throw new Error(
            "Only verified change reports can update university data."
        );
    }

    if (report.appliedAt) {
        throw new Error(
            "This verified change has already been applied."
        );
    }

    if (!report.fieldChanges || report.fieldChanges.length === 0) {
        throw new Error(
            "No field-level changes are available to apply."
        );
    }

    const universities = JSON.parse(
        fs.readFileSync(UNIVERSITY_FILE, "utf8")
    );

    const university = universities.find(
        item => item.id === report.universityId
    );

    if (!university) {
        throw new Error(
            `University ID ${report.universityId} was not found.`
        );
    }

    for (const change of report.fieldChanges) {
        if (change.field === "deadline") {
            university.admission.deadline =
                change.currentValue;
        }

        if (change.field === "applicationFee") {
            university.admission.applicationFee =
                change.currentValue;
        }

        if (change.field === "tuitionFee") {
            university.tuitionFees = [
                change.currentValue
            ];
        }

        if (change.field === "entryTest") {
            university.entryTest =
                change.currentValue;
        }
    }

    university.admission.lastVerified =
        new Date().toISOString();

    university.admission.verificationStatus =
        "verified";

    university.changeHistory =
        university.changeHistory || [];

    university.changeHistory.push({
        changedAt: new Date().toISOString(),
        sourceUrl: report.sourceUrl,
        sourceType: report.sourceType,
        reportPath,
        changes: report.fieldChanges
    });

    fs.writeFileSync(
        UNIVERSITY_FILE,
        JSON.stringify(universities, null, 2)
    );

    report.appliedAt = new Date().toISOString();
    report.applicationStatus = "applied";

    fs.writeFileSync(
        reportPath,
        JSON.stringify(report, null, 2)
    );

    return university;
}

module.exports = {
    applyVerifiedChange
};
