document.addEventListener("DOMContentLoaded", () => {

    const list = document.getElementById("universities-page-list");
    const searchInput = document.getElementById("university-search");
    const count = document.getElementById("university-count");
    const noResults = document.getElementById("no-universities");
    const filterBar = document.getElementById("status-filters");
    const sortSelect = document.getElementById("sort-by");

    let universities = [];
    let activeStatus = "all";
    let activeSort = "name";

    // ---------- Load ----------
    async function loadUniversities() {
        try {
            const res = await fetch("/api/universities");
            if (!res.ok) throw new Error("Failed to load");
            universities = await res.json();
            applyFiltersAndRender();
        } catch (err) {
            console.error(err);
            list.innerHTML = `<p class="loading">Unable to load universities. Please try again.</p>`;
            count.textContent = "Unable to load";
        }
    }

    // ---------- Render ----------
    function applyFiltersAndRender() {
        const keyword = (searchInput?.value || "").trim().toLowerCase();

        let filtered = universities.slice();

        // Status filter
        if (activeStatus !== "all") {
            filtered = filtered.filter(u =>
                (u.admission?.status || "unknown").toLowerCase() === activeStatus
            );
        }

        // Search filter
        if (keyword) {
            filtered = filtered.filter(u =>
                (u.name || "").toLowerCase().includes(keyword) ||
                (u.city || "").toLowerCase().includes(keyword) ||
                (u.fullName || "").toLowerCase().includes(keyword)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            if (activeSort === "name") {
                return (a.name || "").localeCompare(b.name || "");
            }
            if (activeSort === "programs") {
                return (b.programs?.length || 0) - (a.programs?.length || 0);
            }
            if (activeSort === "status") {
                const order = { open: 0, "not-announced": 1, closed: 2, unknown: 3 };
                const sa = order[(a.admission?.status || "unknown").toLowerCase()] ?? 3;
                const sb = order[(b.admission?.status || "unknown").toLowerCase()] ?? 3;
                return sa - sb;
            }
            return 0;
        });

        renderUniversities(filtered);
    }

    function renderUniversities(results) {
        list.innerHTML = "";

        count.textContent = `${results.length} ${
            results.length === 1 ? "university" : "universities"
        }`;

        if (results.length === 0) {
            noResults.innerHTML = `
                <h3>No universities match your search</h3>
                <p>Try a different keyword or clear your filters.</p>
            `;
            noResults.hidden = false;
            return;
        }
        noResults.hidden = true;
        noResults.innerHTML = "";

        results.forEach(u => {
            const card = document.createElement("article");
            card.className = "university-card";
            card.innerHTML = renderCard(u);
            list.appendChild(card);
        });
    }

    function renderCard(u) {
        const status = (u.admission?.status || "unknown").toLowerCase();
        const statusLabel = {
            "open": "Open",
            "closed": "Closed",
            "not-announced": "Not Announced"
        }[status] || "Not Verified";

        const heroStyle = u.heroImage
            ? `style="background-image: linear-gradient(135deg, rgba(17,24,39,0.55), rgba(67,56,202,0.55)), url('${u.heroImage}');"`
            : "";

        const programCount = u.programs?.length || 0;
        const campusCount = countUniqueCampuses(u.programs);
        const city = u.city || "Pakistan";
        const deadline = renderDeadlineSummary(u.admission);

        return `
            <div class="university-card-image ${u.heroImage ? 'has-image' : 'no-image'}" ${heroStyle}>
                <div class="university-card-status status-${status}">${statusLabel}</div>
            </div>

            <div class="university-card-body">
                <h3>${u.name}</h3>
                <p class="university-card-location">📍 ${city}</p>

                <div class="university-card-stats">
                    <div class="card-stat">
                        <span>Programs</span>
                        <strong>${programCount}</strong>
                    </div>
                    <div class="card-stat">
                        <span>Campuses</span>
                        <strong>${campusCount}</strong>
                    </div>
                </div>

                <p class="university-card-deadline">${deadline}</p>

                <a href="university.html?slug=${encodeURIComponent(u.slug)}" class="btn btn-primary university-card-link">
                    View Details →
                </a>
            </div>
        `;
    }

    function countUniqueCampuses(programs) {
        if (!Array.isArray(programs)) return 0;
        const set = new Set();
        programs.forEach(p => {
            (p.campuses || []).forEach(c => set.add(c));
        });
        return set.size || 1;
    }

    function renderDeadlineSummary(admission) {
        if (!admission) return "Deadline: not yet verified";
        const status = (admission.status || "").toLowerCase();
        const last = admission.lastCycle;
        const next = admission.nextCycle;

        if (status === "open" && last?.applicationClose) {
            return `⏰ Apply by ${formatDate(last.applicationClose)}`;
        }
        if (status === "closed" && last?.applicationClose) {
            return `Last closed ${formatDate(last.applicationClose)}`;
        }
        if (next?.applicationOpen) {
            return `Next intake opens ${formatDate(next.applicationOpen)}`;
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

    // ---------- Wire events ----------
    if (searchInput) {
        searchInput.addEventListener("input", applyFiltersAndRender);
    }

    if (filterBar) {
        filterBar.addEventListener("click", e => {
            const btn = e.target.closest("[data-status]");
            if (!btn) return;
            filterBar.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            activeStatus = btn.dataset.status;
            applyFiltersAndRender();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", e => {
            activeSort = e.target.value;
            applyFiltersAndRender();
        });
    }

    loadUniversities();
});
