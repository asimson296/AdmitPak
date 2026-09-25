/**
 * AdmitPak — Saved / Tracked universities renderer (server-backed)
 */

document.addEventListener("DOMContentLoaded", async () => {
    const listEl = document.getElementById("saved-list");
    const emptyEl = document.getElementById("saved-empty");
    const countEl = document.getElementById("saved-count");

    if (!listEl || !emptyEl || !countEl) return;
    if (!window.AdmitPakTracker) return;

    let universitiesCache = null;

    async function loadUniversities() {
        if (universitiesCache) return universitiesCache;
        const res = await fetch("/api/universities");
        universitiesCache = await res.json();
        return universitiesCache;
    }

    async function render() {
        const user = await window.AdmitPakTracker.getUser();

        // --- Logged out: show a prompt instead of empty state ---
        if (!user) {
            countEl.textContent = "Not logged in";
            listEl.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.innerHTML = `
                <div class="saved-empty-icon">☆</div>
                <h3>Log in to track universities</h3>
                <p>Create a free account to save universities and get deadline reminders by email.</p>
                <div class="saved-empty-actions">
                    <a href="/signup.html" class="btn btn-primary">Sign Up Free</a>
                    <a href="/login.html" class="btn btn-secondary">Log In</a>
                </div>
            `;
            return;
        }

        const trackedSlugs = await window.AdmitPakTracker.getTracked();

        countEl.textContent = `${trackedSlugs.length} tracked`;

        if (trackedSlugs.length === 0) {
            listEl.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.innerHTML = `
                <div class="saved-empty-icon">☆</div>
                <h3>You haven't tracked any universities yet</h3>
                <p>Browse universities and click <strong>☆ Track University</strong> to add them here.</p>
                <a href="/universities.html" class="btn btn-primary">Explore Universities</a>
            `;
            return;
        }

        emptyEl.hidden = true;

        const universities = await loadUniversities();
        const tracked = trackedSlugs
            .map(slug => universities.find(u => u.slug === slug))
            .filter(Boolean);

        if (tracked.length === 0) {
            listEl.innerHTML = "";
            emptyEl.hidden = false;
            countEl.textContent = "0 tracked";
            return;
        }

        listEl.innerHTML = tracked.map(renderCard).join("");
        wireUntrackButtons();
    }

    function renderCard(u) {
        const status = (u.admission?.status || "unknown").toLowerCase();
        const deadline = renderDeadlineText(u.admission);
        const location = `${u.city || ""}${u.province ? ", " + u.province : ""}`;

        return `
            <div class="saved-card" data-slug="${u.slug}">
                <button class="saved-card-untrack" type="button" title="Stop tracking" data-untrack="${u.slug}">✕</button>

                <div class="saved-card-status status-${status}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </div>

                <h3>${u.name}</h3>
                <p class="saved-card-location">📍 ${location}</p>
                <p class="saved-card-deadline">${deadline}</p>

                <a href="/university.html?slug=${u.slug}" class="btn btn-secondary saved-card-link">
                    View Details →
                </a>
            </div>
        `;
    }

    function renderDeadlineText(admission) {
        if (!admission) return "Deadline: not yet verified";
        const status = (admission.status || "").toLowerCase();
        const last = admission.lastCycle;
        const next = admission.nextCycle;

        if (status === "closed" && last?.applicationClose) {
            return `Last cycle closed ${formatDate(last.applicationClose)}`;
        }
        if (status === "open" && last?.applicationClose) {
            return `Apply by ${formatDate(last.applicationClose)}`;
        }
        if (next && !next.published) {
            return `Next intake: ${next.year} — not yet published`;
        }
        return "Deadline: not yet announced";
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        });
    }

    function wireUntrackButtons() {
        document.querySelectorAll("[data-untrack]").forEach(btn => {
            btn.addEventListener("click", async e => {
                e.preventDefault();
                const slug = btn.getAttribute("data-untrack");
                btn.disabled = true;
                try {
                    await window.AdmitPakTracker.untrack(slug);
                } catch (err) {
                    console.error(err);
                    btn.disabled = false;
                }
                // Note: `admitpak:tracked-changed` event triggers re-render
            });
        });
    }

    window.addEventListener("admitpak:tracked-changed", render);
    render();
});
