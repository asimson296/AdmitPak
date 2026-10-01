/**
 * AdmitPak — Smart Detector
 *
 * Compares OUR stored data (from universities.json) against the freshly
 * fetched university page. Only flags changes when OUR data might be
 * outdated. Ignores nav, footer, timestamps, and other noise.
 */

// ============================================
// EXTRACTION HELPERS
// ============================================

const MONTH_REGEX = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

/**
 * Extract all unique dates found in text.
 * Patterns covered:
 *  - "June 30, 2026"
 *  - "30 June 2026"
 *  - "30-06-2026", "30/06/2026", "2026-06-30"
 */
function extractDates(text) {
  const found = new Set();
  const patterns = [
    new RegExp("\\b(?:" + MONTH_REGEX + ")\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b", "gi"),
    new RegExp("\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:" + MONTH_REGEX + "),?\\s+\\d{4}\\b", "gi"),
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g
  ];
  patterns.forEach(re => {
    const matches = text.match(re) || [];
    matches.forEach(m => found.add(m.trim().replace(/\s+/g, " ")));
  });
  return [...found];
}

/**
 * Extract all unique fee-like amounts found in text.
 * Patterns covered:
 *  - "Rs. 30,000"
 *  - "PKR 55,000"
 *  - "Rs 100,000/-"
 *  - "Rs.12000"
 */
function extractFees(text) {
  const found = new Set();
  const patterns = [
    /\bRs\.?\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/g,
    /\bPKR\s?\d{1,3}(?:,\d{3})+\b/gi,
    /\bRs\.?\s?\d{4,7}\b/g,
    /\bRs\.?\s?\d{1,3},\d{3}\/-\b/g
  ];
  patterns.forEach(re => {
    const matches = text.match(re) || [];
    matches.forEach(m => found.add(m.trim().replace(/\s+/g, " ")));
  });
  return [...found];
}

// ============================================
// NORMALIZATION
// ============================================

/**
 * Normalize a date string to YYYY-MM-DD for comparison.
 * Returns null if can't be parsed.
 */
function normalizeDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Already ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }
  // "June 30, 2026" or "30 June 2026"
  const months = {
    january:"01", jan:"01", february:"02", feb:"02", march:"03", mar:"03",
    april:"04", apr:"04", may:"05", june:"06", jun:"06", july:"07", jul:"07",
    august:"08", aug:"08", september:"09", sep:"09", october:"10", oct:"10",
    november:"11", nov:"11", december:"12", dec:"12"
  };
  const mdy = s.match(new RegExp("^(" + MONTH_REGEX + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})$", "i"));
  if (mdy) {
    const m = months[mdy[1].toLowerCase()];
    const d = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${m}-${d}`;
  }
  const dMonthY = s.match(new RegExp("^(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + MONTH_REGEX + "),?\\s+(\\d{4})$", "i"));
  if (dMonthY) {
    const m = months[dMonthY[2].toLowerCase()];
    const d = dMonthY[1].padStart(2, "0");
    return `${dMonthY[3]}-${m}-${d}`;
  }
  return null;
}

/**
 * Normalize a fee string to "NNNNN" (digits only) for comparison.
 */
function normalizeFee(str) {
  if (!str) return null;
  const digits = String(str).replace(/[^\d]/g, "");
  if (!digits) return null;
  return String(parseInt(digits, 10));
}

// ============================================
// OUR DATA EXTRACTORS
// ============================================

/**
 * Pull dates we care about from universities.json entry.
 */
function getOurDates(university) {
  const out = [];
  const push = (label, val) => { if (val) out.push({ label, iso: normalizeDate(val), raw: val }); };

  const a = university.admission || {};
  const last = a.lastCycle || {};
  const next = a.nextCycle || {};

  push("Last cycle: application open", last.applicationOpen);
  push("Last cycle: application close", last.applicationClose);
  push("Last cycle: merit list", last.meritList);
  push("Last cycle: classes start", last.classesStart);
  push("Next cycle: application open", next.applicationOpen);
  push("Next cycle: application close", next.applicationClose);

  return out.filter(d => d.iso);
}

/**
 * Pull fees we care about from universities.json entry.
 */
function getOurFees(university) {
  const out = [];
  const push = (label, val) => { if (val && typeof val === "string") out.push({ label, num: normalizeFee(val), raw: val }); };

  const f = university.fees || {};
  push("Admission fee", f.admissionFee);
  push("Admission processing fee", f.admissionProcessingFee);
  push("Security deposit", f.securityDeposit);
  push("Tuition per credit hour", f.tuitionPerCreditHour);
  push("Student activities fund", f.studentActivitiesFund);
  push("Misc charges", f.miscChargesPerSemester);

  // Tiered fees (object form)
  if (f.tuitionPerSemester && typeof f.tuitionPerSemester === "object") {
    Object.entries(f.tuitionPerSemester).forEach(([k, v]) => push("Tuition: " + k, v));
  }

  return out.filter(x => x.num);
}

// ============================================
// COMPARISON LOGIC
// ============================================

/**
 * Check if a specific ISO date appears anywhere in the page text.
 * We normalize all dates found in the page and check for match.
 */
function dateAppearsInPage(isoDate, pageDates) {
  return pageDates.some(d => d === isoDate);
}

/**
 * Check if a specific fee amount appears anywhere in the page text.
 * We normalize all fees found in the page and check for match.
 */
function feeAppearsInPage(feeNum, pageFees) {
  return pageFees.some(f => f === feeNum);
}

/**
 * Main entry: given a university and a source type, and the fetched
 * page content, determine what our data says vs. what the page says.
 *
 * sourceType: "html" or "pdf" — no distinction for smart compare
 * sourceRole: "fees" | "admissions" | "programs" | "scholarships" | "eligibility"
 */
function compareOurDataToPage(university, sourceRole, pageContent) {
  const pageDates = extractDates(pageContent).map(normalizeDate).filter(Boolean);
  const pageFees = extractFees(pageContent).map(normalizeFee).filter(Boolean);

  const result = {
    pageDateCount: pageDates.length,
    pageFeeCount: pageFees.length,
    datesChecked: 0,
    datesMatched: 0,
    datesMissing: [],
    feesChecked: 0,
    feesMatched: 0,
    feesMissing: []
  };

  const shouldCheckDates = ["admissions", "dates", "schedule"].includes(sourceRole);
  const shouldCheckFees = ["fees", "financial", "aid"].includes(sourceRole);

  if (shouldCheckDates) {
    const ourDates = getOurDates(university);
    ourDates.forEach(d => {
      result.datesChecked++;
      if (dateAppearsInPage(d.iso, pageDates)) {
        result.datesMatched++;
      } else {
        result.datesMissing.push({ label: d.label, iso: d.iso, raw: d.raw });
      }
    });
  }

  if (shouldCheckFees) {
    const ourFees = getOurFees(university);
    ourFees.forEach(f => {
      result.feesChecked++;
      if (feeAppearsInPage(f.num, pageFees)) {
        result.feesMatched++;
      } else {
        result.feesMissing.push({ label: f.label, num: f.num, raw: f.raw });
      }
    });
  }

  // Verdict
  const totalChecked = result.datesChecked + result.feesChecked;
  const totalMissing = result.datesMissing.length + result.feesMissing.length;

  if (totalChecked === 0) {
    result.verdict = "skipped"; // source doesn't contain dates or fees
  } else if (totalMissing === 0) {
    result.verdict = "match"; // all our data found on page
  } else {
    result.verdict = "review"; // some of our data not found — could be outdated
  }

  return result;
}

module.exports = {
  extractDates,
  extractFees,
  normalizeDate,
  normalizeFee,
  getOurDates,
  getOurFees,
  compareOurDataToPage
};
