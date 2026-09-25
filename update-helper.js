#!/usr/bin/env node
/**
 * AdmitPak — Interactive universities.json updater
 * Usage: node update-helper.js <slug>
 * Example: node update-helper.js nust
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const UNIS_FILE = path.join(__dirname, "data", "universities.json");

const slug = process.argv[2];

if (!slug) {
    console.log("Usage: node update-helper.js <university-slug>");
    console.log("");
    console.log("Available universities:");
    try {
        const unis = JSON.parse(fs.readFileSync(UNIS_FILE, "utf8"));
        unis.forEach(u => console.log("  - " + u.slug + " (" + u.name + ")"));
    } catch {}
    process.exit(1);
}

const unis = JSON.parse(fs.readFileSync(UNIS_FILE, "utf8"));
const university = unis.find(u => u.slug === slug);

if (!university) {
    console.error("❌ University not found: " + slug);
    process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

function printCurrentState() {
    console.log("");
    console.log("═".repeat(64));
    console.log("📖  " + university.name);
    console.log("═".repeat(64));
    console.log("");

    console.log("📅  ADMISSION");
    console.log("   Status           : " + (university.admission?.status || "—"));
    console.log("   Application Fee  : " + (university.admission?.applicationFee || "—"));
    if (university.admission?.nextCycle) {
        console.log("   Next Cycle Year  : " + (university.admission.nextCycle.year || "—"));
        console.log("   Next Open Date   : " + (university.admission.nextCycle.applicationOpen || "—"));
        console.log("   Next Close Date  : " + (university.admission.nextCycle.applicationClose || "—"));
    }
    console.log("");

    console.log("💰  FEES");
    Object.entries(university.fees || {}).forEach(([k, v]) => {
        if (typeof v === "string") console.log("   " + k + " : " + v);
    });
    console.log("");

    console.log("📋  Programs   : " + (university.programs?.length || 0) + " programs");
    console.log("🎓  Scholarships: " + (university.scholarships?.length || 0) + " entries");
    console.log("📚  Eligibility : " + (university.eligibility?.length || 0) + " groups");
    console.log("");
    console.log("═".repeat(64));
}

const MENU = [
    { key: "1", label: "Update admission status (open / closed / not-announced)", action: updateStatus },
    { key: "2", label: "Update application fee", action: updateAppFee },
    { key: "3", label: "Update next cycle year", action: updateNextYear },
    { key: "4", label: "Update next cycle application open date", action: updateNextOpen },
    { key: "5", label: "Update next cycle application close date", action: updateNextClose },
    { key: "6", label: "Update a specific fee field", action: updateFeeField },
    { key: "7", label: "View full JSON for this university", action: viewFullJson },
    { key: "0", label: "Save & exit", action: null }
];

async function main() {
    while (true) {
        printCurrentState();
        console.log("What do you want to update?");
        MENU.forEach(m => console.log("   " + m.key + ") " + m.label));
        console.log("");

        const answer = (await ask("Choose: ")).trim();
        const item = MENU.find(m => m.key === answer);

        if (!item) {
            console.log("❌ Invalid choice.");
            continue;
        }

        if (item.key === "0") {
            console.log("💾 Saving...");
            fs.writeFileSync(UNIS_FILE, JSON.stringify(unis, null, 2));
            console.log("✅ Saved to universities.json");
            console.log("   → Now run: git add -A && git commit -m 'Update " + slug + " data' && git push");
            rl.close();
            return;
        }

        try {
            await item.action();
            // Save after every change (safety net)
            fs.writeFileSync(UNIS_FILE, JSON.stringify(unis, null, 2));
            console.log("✅ Change saved.");
        } catch (err) {
            console.error("❌ Error:", err.message);
        }
    }
}

async function updateStatus() {
    console.log("");
    console.log("Current status: " + (university.admission.status || "—"));
    console.log("Options: open / closed / not-announced");
    const val = (await ask("New status: ")).trim().toLowerCase();
    if (!["open", "closed", "not-announced"].includes(val)) {
        throw new Error("Must be one of: open, closed, not-announced");
    }
    university.admission.status = val;
}

async function updateAppFee() {
    console.log("");
    console.log("Current: " + (university.admission.applicationFee || "—"));
    const val = (await ask("New application fee: ")).trim();
    if (!val) throw new Error("Cannot be empty.");
    university.admission.applicationFee = val;
}

async function updateNextYear() {
    console.log("");
    console.log("Current: " + (university.admission.nextCycle?.year || "—"));
    const val = (await ask("New year (e.g. 2027): ")).trim();
    const num = parseInt(val);
    if (!num) throw new Error("Invalid year.");
    if (!university.admission.nextCycle) university.admission.nextCycle = {};
    university.admission.nextCycle.year = num;
}

async function updateNextOpen() {
    console.log("");
    console.log("Current: " + (university.admission.nextCycle?.applicationOpen || "—"));
    console.log("Format: YYYY-MM-DD");
    const val = (await ask("New open date: ")).trim();
    if (!val) throw new Error("Cannot be empty.");
    if (!university.admission.nextCycle) university.admission.nextCycle = {};
    university.admission.nextCycle.applicationOpen = val;
    university.admission.nextCycle.published = true;
}

async function updateNextClose() {
    console.log("");
    console.log("Current: " + (university.admission.nextCycle?.applicationClose || "—"));
    console.log("Format: YYYY-MM-DD");
    const val = (await ask("New close date: ")).trim();
    if (!val) throw new Error("Cannot be empty.");
    if (!university.admission.nextCycle) university.admission.nextCycle = {};
    university.admission.nextCycle.applicationClose = val;
    university.admission.nextCycle.published = true;
}

async function updateFeeField() {
    console.log("");
    const keys = Object.keys(university.fees || {});
    if (keys.length === 0) {
        console.log("No fee fields available.");
        return;
    }
    keys.forEach((k, i) => {
        const v = university.fees[k];
        const display = typeof v === "object" ? "(nested object)" : v;
        console.log("   " + (i + 1) + ") " + k + " = " + display);
    });
    console.log("");
    const idx = parseInt((await ask("Pick number: ")).trim());
    if (!idx || idx < 1 || idx > keys.length) throw new Error("Invalid number.");
    const key = keys[idx - 1];
    const val = (await ask("New value: ")).trim();
    if (!val) throw new Error("Cannot be empty.");
    university.fees[key] = val;
}

async function viewFullJson() {
    console.log("");
    console.log(JSON.stringify(university, null, 2));
    await ask("Press Enter to continue...");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
