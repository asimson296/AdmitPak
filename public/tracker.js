/**
 * AdmitPak — Tracking helper (server-backed, with signup modal)
 */

(function () {
    let cachedUser = undefined; // undefined = not yet fetched, null = anonymous, object = logged in

    async function getUser() {
        if (cachedUser !== undefined) return cachedUser;
        try {
            const res = await fetch("/api/me", { credentials: "same-origin" });
            const data = await res.json();
            cachedUser = data.user || null;
        } catch {
            cachedUser = null;
        }
        return cachedUser;
    }

    function invalidateUserCache() {
        cachedUser = undefined;
    }

    async function getTracked() {
        const user = await getUser();
        if (!user) return [];
        try {
            const res = await fetch("/api/tracked", { credentials: "same-origin" });
            const data = await res.json();
            return Array.isArray(data.tracked) ? data.tracked : [];
        } catch {
            return [];
        }
    }

    async function isTracked(slug) {
        const tracked = await getTracked();
        return tracked.includes(slug);
    }

    async function track(slug) {
        const res = await fetch(`/api/track/${encodeURIComponent(slug)}`, {
            method: "POST",
            credentials: "same-origin",
        });
        if (!res.ok) throw new Error("Failed to track");
        window.dispatchEvent(new CustomEvent("admitpak:tracked-changed"));
        return true;
    }

    async function untrack(slug) {
        const res = await fetch(`/api/track/${encodeURIComponent(slug)}`, {
            method: "DELETE",
            credentials: "same-origin",
        });
        if (!res.ok) throw new Error("Failed to untrack");
        window.dispatchEvent(new CustomEvent("admitpak:tracked-changed"));
        return true;
    }

    async function toggle(slug) {
        if (await isTracked(slug)) {
            await untrack(slug);
            return false;
        } else {
            await track(slug);
            return true;
        }
    }

    // ---------- Signup prompt modal ----------

    function showSignupModal() {
        // Avoid duplicate modals
        if (document.getElementById("admitpak-modal")) return;

        const overlay = document.createElement("div");
        overlay.id = "admitpak-modal";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true">
                <button class="modal-close" type="button" aria-label="Close">✕</button>
                <div class="modal-icon">☆</div>
                <h2>Sign up to track universities</h2>
                <p>
                    Create a free account to save universities and get deadline
                    reminders by email. No spam — just the deadlines that matter.
                </p>
                <div class="modal-actions">
                    <a href="/signup.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}"
                       class="btn btn-primary modal-btn-primary">
                        Sign Up Free
                    </a>
                    <a href="/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}"
                       class="btn btn-secondary modal-btn-secondary">
                        Log In
                    </a>
                </div>
                <button class="modal-maybe-later" type="button">Maybe later</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Wire close actions
        overlay.querySelector(".modal-close").addEventListener("click", closeModal);
        overlay.querySelector(".modal-maybe-later").addEventListener("click", closeModal);
        overlay.addEventListener("click", e => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener("keydown", escClose);

        function escClose(e) {
            if (e.key === "Escape") closeModal();
        }

        function closeModal() {
            overlay.remove();
            document.removeEventListener("keydown", escClose);
        }
    }

    window.AdmitPakTracker = {
        getUser,
        getTracked,
        isTracked,
        track,
        untrack,
        toggle,
        showSignupModal,
        invalidateUserCache,
    };
})();
