/**
 * AdmitPak — Auto-update university count on homepage
 */

document.addEventListener("DOMContentLoaded", async () => {
    const el = document.getElementById("universities-count");
    if (!el) return;

    try {
        const res = await fetch("/api/universities");
        if (!res.ok) throw new Error("Failed");
        const unis = await res.json();

        // Zero-padded 2-digit number (e.g. 05, 07, 12)
        el.textContent = String(unis.length).padStart(2, "0");
    } catch {
        el.textContent = "—";
    }
});
