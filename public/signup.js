document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signup-form");
    const errorEl = document.getElementById("signup-error");
    const btn = document.getElementById("signup-btn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.hidden = true;

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!email || !password || !confirmPassword) {
            showError("All fields are required.");
            return;
        }
        if (password.length < 6) {
            showError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Creating account...";

        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "Something went wrong.");
                btn.disabled = false;
                btn.textContent = "Create Account";
                return;
            }

            // Check for a "next" redirect (from the track modal)
            const params = new URLSearchParams(window.location.search);
            const next = params.get("next") || "/";
            window.location.href = next;

        } catch (err) {
            console.error(err);
            showError("Network error. Please try again.");
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }
});
