document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.hidden = true;

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            showError("Email and password are required.");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Logging in...";

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "Login failed.");
                btn.disabled = false;
                btn.textContent = "Log In";
                return;
            }

            const params = new URLSearchParams(window.location.search);
            const next = params.get("next") || "/";
            window.location.href = next;

        } catch (err) {
            console.error(err);
            showError("Network error. Please try again.");
            btn.disabled = false;
            btn.textContent = "Log In";
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }
});
