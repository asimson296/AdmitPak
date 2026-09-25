/**
 * AdmitPak — Floating feedback button + modal
 */

(function () {
    if (document.getElementById("feedback-root")) return; // avoid duplicates

    // ---------- Floating button ----------
    const root = document.createElement("div");
    root.id = "feedback-root";
    root.innerHTML = `
        <button type="button" class="feedback-fab" id="feedback-fab" title="Send feedback" aria-label="Send feedback">
            <span class="feedback-fab-icon">💬</span>
            <span class="feedback-fab-label">Feedback</span>
        </button>

        <div class="feedback-modal-overlay" id="feedback-overlay" hidden>
            <div class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">

                <button type="button" class="feedback-close" id="feedback-close" aria-label="Close">✕</button>

                <div class="feedback-header">
                    <div class="feedback-icon">💬</div>
                    <h2 id="feedback-title">Share your feedback</h2>
                    <p>Help us improve AdmitPak. Tell us what's working, what's not, or what you'd like to see.</p>
                </div>

                <form id="feedback-form" class="feedback-form" novalidate>

                    <label>
                        <span>Category</span>
                        <select id="feedback-category">
                            <option value="suggestion">💡 Suggestion</option>
                            <option value="bug">🐞 Bug report</option>
                            <option value="missing-data">📋 Missing university data</option>
                            <option value="praise">⭐ Praise</option>
                            <option value="general">💬 General</option>
                        </select>
                    </label>

                    <label>
                        <span>Your message</span>
                        <textarea id="feedback-message" rows="4" placeholder="What's on your mind?" maxlength="3000" required></textarea>
                        <small class="feedback-counter" id="feedback-counter">0 / 3000</small>
                    </label>

                    <label>
                        <span>Email (optional — if you want a reply)</span>
                        <input type="email" id="feedback-email" placeholder="you@example.com" autocomplete="email">
                    </label>

                    <div class="feedback-error" id="feedback-error" hidden></div>

                    <button type="submit" class="feedback-submit" id="feedback-submit">
                        Send Feedback
                    </button>
                </form>

                <div class="feedback-success" id="feedback-success" hidden>
                    <div class="feedback-success-icon">✓</div>
                    <h3>Thank you!</h3>
                    <p>Your feedback has been received. We really appreciate you taking the time.</p>
                    <button type="button" class="feedback-submit" id="feedback-close-success">Close</button>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(root);

    // ---------- Elements ----------
    const fab = document.getElementById("feedback-fab");
    const overlay = document.getElementById("feedback-overlay");
    const closeBtn = document.getElementById("feedback-close");
    const form = document.getElementById("feedback-form");
    const errorEl = document.getElementById("feedback-error");
    const counter = document.getElementById("feedback-counter");
    const messageEl = document.getElementById("feedback-message");
    const emailEl = document.getElementById("feedback-email");
    const submitBtn = document.getElementById("feedback-submit");
    const successEl = document.getElementById("feedback-success");
    const closeSuccessBtn = document.getElementById("feedback-close-success");

    // ---------- Open / Close ----------
    function open() {
        overlay.hidden = false;
        requestAnimationFrame(() => overlay.classList.add("visible"));
        setTimeout(() => messageEl.focus(), 200);
    }

    function close() {
        overlay.classList.remove("visible");
        setTimeout(() => {
            overlay.hidden = true;
            resetForm();
        }, 200);
    }

    function resetForm() {
        form.reset();
        form.hidden = false;
        successEl.hidden = true;
        errorEl.hidden = true;
        counter.textContent = "0 / 3000";
    }

    fab.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    closeSuccessBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !overlay.hidden) close();
    });

    // ---------- Character counter ----------
    messageEl.addEventListener("input", () => {
        counter.textContent = `${messageEl.value.length} / 3000`;
    });

    // ---------- Submit ----------
    form.addEventListener("submit", async e => {
        e.preventDefault();
        errorEl.hidden = true;

        const message = messageEl.value.trim();
        if (!message) {
            showError("Please write a message.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";

        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    category: document.getElementById("feedback-category").value,
                    message,
                    email: emailEl.value.trim() || null,
                    pageUrl: window.location.href
                })
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "Could not send feedback.");
                submitBtn.disabled = false;
                submitBtn.textContent = "Send Feedback";
                return;
            }

            form.hidden = true;
            successEl.hidden = false;

        } catch (err) {
            console.error(err);
            showError("Network error. Please try again.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Send Feedback";
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }
})();
