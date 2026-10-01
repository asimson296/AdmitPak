/**
 * AdmitPak — Content Cleaner
 *
 * Strips common noise from scraped university pages BEFORE hashing.
 * This makes change detection focus on real content changes,
 * not cosmetic ones (footers, timestamps, menus, etc.).
 */

// ============================================
// HTML ENTITY DECODING
// ============================================

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2013;/g, "-")
    .replace(/&#x2014;/g, "-")
    .replace(/&#x2018;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"')
    .replace(/&#x201D;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return " "; }
    })
    .replace(/&#(\d+);/g, (m, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return " "; }
    });
}

// ============================================
// UNIVERSAL NOISE PATTERNS
// Applied to every page — strips text that is never "important" data
// ============================================

const UNIVERSAL_NOISE = [
  // Copyright + footer
  /©\s*\d{4}[^.]{0,80}(all rights reserved)?/gi,
  /copyright\s+\d{4}[^.]{0,80}/gi,
  /all rights reserved/gi,
  /\bPowered by\b[^.]{0,80}/gi,
  /\bDesigned (?:and Developed )?by\b[^.]{0,80}/gi,

  // Timestamps + view counters
  /view[s]?\s*[:.]?\s*\d+/gi,
  /\d+\s*view[s]?\b/gi,
  /page (?:visits|hits|views)\s*[:.]?\s*\d+/gi,

  // "Last updated" — very common on every page
  /last\s+updated\s+(?:on)?\s*[:\-]?\s*[A-Za-z0-9, \-\.\/]{3,40}/gi,
  /updated\s+on\s*[:\-]?\s*[A-Za-z0-9, \-\.\/]{3,40}/gi,

  // Social media URLs
  /https?:\/\/(?:www\.)?(?:facebook|twitter|instagram|linkedin|youtube|tiktok|whatsapp)\.[^\s]{0,60}/gi,

  // Common page furniture
  /\b(?:Quick Links?|Useful Links?|Related Links?|Important Links?|External Links?)\b/gi,
  /\b(?:Subscribe to (?:our|the) newsletter|Newsletter|Sign up for updates?)\b/gi,
  /\b(?:Read More|Learn More|Click here|Click to view|View Details?|Download|Download PDF|Apply Now|Apply Online)\b/gi,

  // Phone/email/address (footer-level noise — but NOT business info)
  /\bTel(?:ephone)?\s*[:.]?\s*[\d\-\s\(\)\+]{8,25}/gi,
  /\bFax\s*[:.]?\s*[\d\-\s\(\)\+]{8,25}/gi,

  // Social icons alt text + captions
  /\b(?:Follow us on|Like us on|Join us on)\b/gi,

  // Menu-like separators with common short words
  // (e.g. "Home | About | Contact | Careers")
  /\b(?:Home|About|Contact|Careers|News|Events|Blog|FAQs?|Sitemap|Search|Login|Register|Sign ?[Ii]n|Sign ?[Uu]p)\b(?:\s*[\|\·•]\s*(?:Home|About|Contact|Careers|News|Events|Blog|FAQs?|Sitemap|Search|Login|Register|Sign ?[Ii]n|Sign ?[Uu]p)){2,}/gi,

  // Empty decorative text
  /\b(?:[Aa]dvertisement|[Ss]ponsored|[Pp]romoted)\b/gi
];

// ============================================
// MAIN CLEAN FUNCTION
// ============================================

/**
 * Clean text so that its hash only changes when MEANINGFUL content changes.
 * Applied to every page before saving snapshots + comparing.
 */
function cleanContent(text) {
  if (!text || typeof text !== "string") return "";

  let out = text;

  // 1. Decode HTML entities first (so patterns match the visible text)
  out = decodeHtmlEntities(out);

  // 2. Apply universal noise patterns
  for (const pattern of UNIVERSAL_NOISE) {
    out = out.replace(pattern, " ");
  }

  // 3. Collapse whitespace
  out = out.replace(/\s+/g, " ").trim();

  return out;
}

/**
 * Optional: apply additional per-source ignore patterns on top of universal cleaning.
 * Patterns come from monitor-config.json (source.ignorePatterns).
 */
function applySourcePatterns(text, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return text;
  let out = text;
  for (const p of patterns) {
    try {
      const re = new RegExp(p, "gi");
      out = out.replace(re, " ");
    } catch (err) {
      console.warn("⚠️  Bad ignore pattern:", p, "-", err.message);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

module.exports = {
  decodeHtmlEntities,
  cleanContent,
  applySourcePatterns
};
