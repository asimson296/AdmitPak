document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
        showError("No university was selected.");
        return;
    }

    try {
        const response = await fetch("/api/universities");
        if (!response.ok) throw new Error("Failed to load university data");

        const universities = await response.json();
        const university = universities.find(item => item.slug === slug);

        if (!university) {
            showError("University not found.");
            return;
        }

        displayUniversity(university);

    } catch (error) {
        console.error(error);
        showError("Unable to load university information: " + error.message);
    }


    function displayUniversity(university) {

        document.title = `${university.name} — AdmitPak`;

        console.log('[DEBUG] displayUniversity started for:', university.slug);

        // --- Basic info ---
        setAll("[data-university-name]", university.name);
        setAll("[data-university-location]",
            `${university.city}, ${university.province}`);

        // --- Hero background image ---
        const heroSection = document.querySelector(".university-hero");
        if (heroSection && university.heroImage) {
            heroSection.style.setProperty("--hero-image", `url('${university.heroImage}')`);
            heroSection.classList.add("has-hero-image");
        }

        // --- Hero intro (from about.summary) ---
        const introEl = document.querySelector("[data-university-intro]");
        if (introEl) {
            const summary = university.about?.summary;
            if (summary) {
                introEl.textContent = summary;
            } else {
                introEl.textContent = "Overview coming soon.";
            }
        }

        console.log('[DEBUG] About to run wireTracking');
        wireTracking(university.slug);

        // --- Share buttons ---
        wireShare(university);

        // --- Links ---
        setAllHref("[data-official-website]", university.officialWebsite);
        setAllHref("[data-application-portal]", university.applicationPortal);

        // --- Admission status ---
        const statusEl = document.querySelector("[data-admission-status]");
        if (statusEl) {
            const status = university.admission.status || "Unknown";
            statusEl.textContent = status;
            const safeClass = "status-" + String(status)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
            if (safeClass !== "status-") {
                statusEl.classList.add(safeClass);
            }
        }

        // --- Deadline block (new logic) ---
        const deadlineEl = document.querySelector("[data-deadline]");
        if (deadlineEl) {
            deadlineEl.innerHTML = renderDeadline(university.admission);
        }

        // --- Application fee ---
        const feeEl = document.querySelector("[data-application-fee]");
        if (feeEl) {
            feeEl.textContent = university.admission.applicationFee
                || "Not yet verified";
        }

        console.log('[DEBUG] About to renderFees');
        renderFees(university.fees, university.sources);

        console.log('[DEBUG] About to renderPrograms');
        renderPrograms(university.programs, university.sources);

        console.log('[DEBUG] About to renderScholarships');
        renderScholarships(university.scholarships, university.sources);

        console.log('[DEBUG] About to renderEligibility');
        renderEligibility(university.eligibility, university.entryTest, university.sources);

        // --- Official sources block ---
        renderSources(university.sources);

        console.log('[DEBUG] About to renderAbout');
        renderAbout(university.about);
        console.log('[DEBUG] displayUniversity finished');
    }


    // ============ RENDER HELPERS ============

    function renderDeadline(admission) {
        if (!admission) return "Not yet verified";

        const last = admission.lastCycle;
        const next = admission.nextCycle;
        const status = admission.status;

        let html = "";

        if (status === "closed" && last) {
            html += `<strong>Closed</strong> — last cycle closed `;
            html += `<em>${formatDate(last.applicationClose)}</em>.`;
        } else if (status === "open" && last) {
            html += `<strong>Open</strong> — apply by `;
            html += `<em>${formatDate(last.applicationClose)}</em>.`;
        } else {
            html += "Not yet announced.";
        }

        if (next) {
            html += `<br><small>Next intake: ${next.year}`;
            html += next.published
                ? ` (${next.expectedWindow || "details soon"})`
                : ` — not yet published`;
            html += `</small>`;
        }

        return html;
    }


    function renderFees(fees, sources) {
        const container = document.querySelector("[data-fees-container]");
        if (!container) return;

        if (!fees) {
            container.innerHTML = "<p>Fee information coming soon.</p>";
            return;
        }

        let html = "";

        // ---------- One-time fees ----------
        const oneTime = [];
        if (fees.admissionFee)            oneTime.push(["Admission Fee", fees.admissionFee, "one-time"]);
        if (fees.admissionProcessingFee)  oneTime.push(["Admission Processing Fee", fees.admissionProcessingFee, "one-time"]);
        if (fees.securityDeposit)         oneTime.push(["Security Deposit", fees.securityDeposit, "refundable"]);

        // ---------- Recurring / per semester ----------
        const recurring = [];

        // Simple per-credit-hour style (FAST)
        if (fees.tuitionPerCreditHour) {
            recurring.push(["Tuition (per credit hour)", fees.tuitionPerCreditHour, "per credit hour", null]);
        }
        if (fees.studentActivitiesFund) {
            recurring.push(["Student Activities Fund", fees.studentActivitiesFund, "per semester", null]);
        }

        // Per-semester tiered (NUST)
        if (fees.tuitionPerSemester && typeof fees.tuitionPerSemester === "object") {
            const tierLabels = {
                engineeringComputingSciences: "Engineering / Computing / Sciences",
                architectureSocialSciencesBusiness: "Architecture / Social Sciences / Business"
            };
            Object.entries(fees.tuitionPerSemester).forEach(([key, value]) => {
                const label = tierLabels[key] || key;
                recurring.push([`Tuition — ${label}`, value, "per semester", null]);
            });
        }

        if (fees.miscChargesPerSemester) {
            recurring.push(["Misc. Charges (sports, library, health, IT)", fees.miscChargesPerSemester, "per semester", null]);
        }
        if (fees.hbsLicensingFee) {
            recurring.push(["HBS Licensing Fee", fees.hbsLicensingFee, "per year", null]);
        }
        if (fees.repeatCourseFeePerCreditHour) {
            recurring.push(["Repeat / Summer / Improvement", fees.repeatCourseFeePerCreditHour, "per credit hour", null]);
        }

        // FA-style estimate card
        if (fees.estimatedSemesterFee) {
            recurring.push([
                "Estimated Semester Fee",
                fees.estimatedSemesterFee,
                "estimate",
                fees.estimatedSemesterFeeNote || null
            ]);
        }

        // ---------- Render ----------
        if (oneTime.length) {
            html += `<div class="fee-group">
                <h3 class="fee-group-title one-time">One-Time Fees</h3>
                <div class="fee-grid">`;
            html += oneTime.map(([label, value, tag]) => renderFeeCard(label, value, tag, "one-time", null)).join("");
            html += `</div></div>`;
        }

        if (recurring.length) {
            html += `<div class="fee-group">
                <h3 class="fee-group-title recurring">Per Semester / Recurring</h3>
                <div class="fee-grid">`;
            html += recurring.map(([label, value, tag, note]) => renderFeeCard(label, value, tag, "recurring", note)).join("");
            html += `</div></div>`;
        }

        if (fees.note) {
            html += `<p class="fee-note"><small>${fees.note}</small></p>`;
        }

        html += renderVerifyButton(sources, "fees");

        container.innerHTML = html;
    }

    function renderFeeCard(label, value, tag, type, note) {
        return `
            <div class="fee-card ${type}">
                <span class="fee-label">${label}</span>
                <strong class="fee-value">${value}</strong>
                ${tag ? `<span class="fee-tag ${type}">${tag}</span>` : ""}
                ${note ? `<p class="fee-card-note">${note}</p>` : ""}
            </div>
        `;
    }


    function renderPrograms(programs, sources) {
        const container = document.querySelector("[data-programs-container]");
        if (!container) return;

        if (!programs || programs.length === 0) {
            container.innerHTML = "<p>Program information coming soon.</p>";
            return;
        }

        // Group by `group`
        const groups = {};
        programs.forEach(p => {
            const g = p.group || "Programs";
            if (!groups[g]) groups[g] = [];
            groups[g].push(p);
        });

        const icons = {
            "Engineering": "⚙️",
            "Computing": "💻",
            "Business": "📊",
            "Social Sciences & Law": "📚",
            "Architecture & Design": "🏛️",
            "Natural & Applied Sciences": "🔬",
            "Interdisciplinary": "🧩"
        };

        const SHOW_LIMIT = 6;

        let html = '<div class="programs-grid">';

        html += Object.entries(groups).map(([group, items]) => {
            const icon = icons[group] || "🎓";
            const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const hasMore = items.length > SHOW_LIMIT;

            const visible = hasMore ? items.slice(0, SHOW_LIMIT) : items;
            const hidden = hasMore ? items.slice(SHOW_LIMIT) : [];

            const renderItem = (p) => {
                const campuses = Array.isArray(p.campuses) && p.campuses.length
                    ? `<span class="program-campuses">${p.campuses.join(" · ")}</span>`
                    : "";
                return `<li><span class="program-name">${p.name}</span>${campuses}</li>`;
            };

            return `
                <div class="program-card group-${slug}">
                    <div class="program-card-header">
                        <span class="program-icon">${icon}</span>
                        <div>
                            <h4>${group}</h4>
                            <span class="program-count">${items.length} program${items.length !== 1 ? "s" : ""}</span>
                        </div>
                    </div>
                    <ul class="program-list">
                        ${visible.map(renderItem).join("")}
                        ${hidden.length ? `<li class="program-more" hidden>${hidden.map(p => `<span class="program-name">${p.name}</span>${Array.isArray(p.campuses) && p.campuses.length ? `<span class="program-campuses">${p.campuses.join(" · ")}</span>` : ""}`).join("</li><li class=\"program-more\" hidden>")}</li>` : ""}
                    </ul>
                    ${hasMore ? `<button class="program-toggle" type="button" data-toggle-group="${slug}">Show all ${items.length} →</button>` : ""}
                </div>
            `;
        }).join("");

        html += '</div>';

        html += renderVerifyButton(sources, "programs");

        container.innerHTML = html;

        // Wire "Show all" toggles
        container.querySelectorAll("[data-toggle-group]").forEach(btn => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".program-card");
                const hiddenItems = card.querySelectorAll(".program-more");
                const isHidden = hiddenItems.length && hiddenItems[0].hidden;

                hiddenItems.forEach(li => { li.hidden = !isHidden; });

                btn.textContent = isHidden
                    ? "Show less ↑"
                    : `Show all ${hiddenItems.length + SHOW_LIMIT} →`;
            });
        });
    }


    function renderScholarships(scholarships, sources) {
        const container = document.querySelector("[data-scholarships-container]");
        if (!container) return;

        if (!scholarships || scholarships.length === 0) {
            container.innerHTML = "<p>Scholarship information coming soon.</p>";
            return;
        }

        const internal = scholarships.filter(s => (s.type || "").toLowerCase() === "internal");
        const external = scholarships.filter(s => (s.type || "").toLowerCase() !== "internal");

        let html = "";

        if (internal.length) {
            html += `<div class="scholarship-group">
                <h3 class="scholarship-group-title internal">Internal Scholarships</h3>
                <div class="scholarship-grid">`;
            html += internal.map(renderScholarshipCard).join("");
            html += `</div></div>`;
        }

        if (external.length) {
            html += `<div class="scholarship-group">
                <h3 class="scholarship-group-title external">External Scholarships</h3>
                <div class="scholarship-grid">`;
            html += external.map(renderScholarshipCard).join("");
            html += `</div></div>`;
        }

        html += renderVerifyButton(sources, "scholarships");

        container.innerHTML = html;
    }

    function renderScholarshipCard(s) {
        const typeClass = (s.type || "external").toLowerCase() === "internal"
            ? "internal" : "external";

        return `
            <div class="scholarship-card ${typeClass}">
                <div class="scholarship-card-header">
                    <h4>${s.name}</h4>
                    <span class="scholarship-badge ${typeClass}">${s.type || "External"}</span>
                </div>
                <p>${s.description || ""}</p>
            </div>
        `;
    }


    function renderEligibility(eligibility, entryTest, sources) {
        const container = document.querySelector("[data-eligibility-container]");
        if (!container) return;

        let html = "";

        if (entryTest) {
            html += `<div class="eligibility-entry-test">
                <span class="label">Entry Test</span>
                <strong>${entryTest}</strong>
            </div>`;
        }

        if (!eligibility || eligibility.length === 0) {
            html += "<p>Eligibility information coming soon.</p>";
            container.innerHTML = html;
            return;
        }

        html += `<div class="eligibility-grid">`;

        html += eligibility.map(e => {
            const programs = (e.programs || []).map(p => `<span class="program-tag">${p}</span>`).join("");

            return `
                <div class="eligibility-card">
                    <div class="eligibility-card-header">
                        <h4>${e.group || "Program Group"}</h4>
                    </div>

                    <div class="eligibility-card-programs">
                        ${programs}
                    </div>

                    <div class="eligibility-card-stats">
                        <div class="stat">
                            <span>Matric (SSC)</span>
                            <strong>${e.sscMin || "—"}</strong>
                        </div>
                        <div class="stat">
                            <span>FSc (HSSC)</span>
                            <strong>${e.hsscMin || "—"}</strong>
                        </div>
                        <div class="stat">
                            <span>Subjects</span>
                            <strong>${e.subjects || "—"}</strong>
                        </div>
                    </div>

                    <div class="eligibility-card-tests">
                        <span class="label">Accepted Tests</span>
                        <ul>
                            ${(e.entryTests || []).map(t => `<li>${t}</li>`).join("")}
                        </ul>
                    </div>

                    ${e.weightage ? `
                        <div class="eligibility-card-weightage">
                            <span class="label">Merit Weightage</span>
                            <div class="weightage-row">
                                <span>Test</span><strong>${e.weightage.test}</strong>
                            </div>
                            <div class="weightage-row">
                                <span>HSSC</span><strong>${e.weightage.hssc}</strong>
                            </div>
                            <div class="weightage-row">
                                <span>SSC</span><strong>${e.weightage.ssc}</strong>
                            </div>
                        </div>
                    ` : ""}
                </div>
            `;
        }).join("");

        html += `</div>`;

        html += renderVerifyButton(sources, "eligibility");

        container.innerHTML = html;
    }


    function renderSources(sources) {
        const container = document.querySelector("[data-sources-container]");
        if (!container) return;
        if (!sources) { container.innerHTML = ""; return; }

        const labelMap = {
            admissions: "Admission Schedule",
            programs: "Offered Programs",
            fees: "Fee Structure",
            scholarships: "Scholarships",
            eligibility: "Eligibility Criteria"
        };

        const links = Object.entries(sources)
            .filter(([, url]) => url)
            .map(([key, url]) => `
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link">
                    ${labelMap[key] || key} ↗
                </a>
            `).join("");

        container.innerHTML = links || "";
    }


    function renderAbout(about) {
        const container = document.querySelector("[data-about-container]");
        if (!container) return;

        if (!about) {
            container.innerHTML = "<p>Overview coming soon.</p>";
            return;
        }

        let html = "";

        if (about.summary) {
            html += `<p class="about-summary">${about.summary}</p>`;
        }
        if (about.reputation) {
            html += `<p class="about-reputation">${about.reputation}</p>`;
        }
        if (about.bestFor) {
            html += `<p class="about-bestfor"><strong>Best for:</strong> ${about.bestFor}</p>`;
        }
        if (Array.isArray(about.strengths) && about.strengths.length) {
            html += `<ul class="about-strengths">`;
            html += about.strengths.map(s => `<li>${s}</li>`).join("");
            html += `</ul>`;
        }

        container.innerHTML = html;
    }


    function renderVerifyButton(sources, key) {
        if (!sources || !sources[key]) return "";
        const url = sources[key];
        return `
            <div class="section-verify">
                <span class="section-verify-label">Source: Official university page</span>
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="section-verify-btn">
                    Verify ↗
                </a>
            </div>
        `;
    }


    async function wireTracking(slug) {
        if (!window.AdmitPakTracker) return;

        await updateTrackButtons(slug);

        document.querySelectorAll("[data-track-university]").forEach(btn => {
            btn.addEventListener("click", async e => {
                e.preventDefault();
                if (btn.disabled) return;

                const user = await window.AdmitPakTracker.getUser();
                if (!user) {
                    window.AdmitPakTracker.showSignupModal();
                    return;
                }

                btn.disabled = true;
                try {
                    await window.AdmitPakTracker.toggle(slug);
                    await updateTrackButtons(slug);
                } catch (err) {
                    console.error(err);
                } finally {
                    btn.disabled = false;
                }
            });
        });

        window.addEventListener("admitpak:tracked-changed", () => updateTrackButtons(slug));
    }

    async function updateTrackButtons(slug) {
        if (!window.AdmitPakTracker) return;
        const tracked = await window.AdmitPakTracker.isTracked(slug);

        document.querySelectorAll("[data-track-university]").forEach(btn => {
            if (tracked) {
                btn.classList.add("tracked");
                btn.innerHTML = "★ Tracking";
                btn.title = "Click to stop tracking";
            } else {
                btn.classList.remove("tracked");
                btn.innerHTML = "☆ Track University";
                btn.title = "Click to track this university";
            }
        });
    }


    function wireShare(university) {
        const url = window.location.href;
        const title = university.name + " — AdmitPak";
        const text = `Check out ${university.name} admissions, fees, programs and deadlines on AdmitPak.`;

        document.querySelectorAll("[data-share]").forEach(el => {
            const type = el.dataset.share;

            if (type === "whatsapp") {
                el.href = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
            }
            if (type === "facebook") {
                el.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            }
            if (type === "twitter") {
                el.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            }
            if (type === "copy") {
                el.addEventListener("click", async (e) => {
                    e.preventDefault();
                    try {
                        await navigator.clipboard.writeText(url);
                        const original = el.innerHTML;
                        el.innerHTML = "<span>✓</span> Copied!";
                        setTimeout(() => { el.innerHTML = original; }, 1800);
                    } catch {
                        alert("Copy failed. Link: " + url);
                    }
                });
            }
        });
    }


    // ============ UTILS ============

    function setAll(selector, value) {
        document.querySelectorAll(selector).forEach(el => {
            el.textContent = value;
        });
    }

    function setAllHref(selector, value) {
        document.querySelectorAll(selector).forEach(el => {
            el.href = value;
        });
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        });
    }


    function showError(message) {
        document.querySelector("main").innerHTML = `
            <section class="universities-list-section">
                <div class="container">
                    <div class="no-universities">
                        <h3>${message}</h3>
                        <p>Please return to the universities directory and select a university.</p>
                        <br>
                        <a href="/universities.html" class="btn btn-primary">Browse Universities</a>
                    </div>
                </div>
            </section>
        `;
    }

});
