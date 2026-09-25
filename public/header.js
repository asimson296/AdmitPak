/**
 * AdmitPak — Header auth status
 * Updates the nav with either Log In/Sign Up or Hi, name/Log Out.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;

    let user = null;
    try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        const data = await res.json();
        user = data.user;
    } catch {
        user = null;
    }

    if (user) {
        renderLoggedIn(nav, user);
    } else {
        renderLoggedOut(nav);
    }

    function renderLoggedIn(nav, user) {
        const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];

        // Find existing login/signup links and replace them
        nav.querySelectorAll("a").forEach(a => {
            const href = a.getAttribute("href") || "";
            const text = (a.textContent || "").trim().toLowerCase();
            if (
                href.includes("login.html") ||
                href.includes("signup.html") ||
                text === "log in" ||
                text === "sign up"
            ) {
                a.remove();
            }
        });

        // Add "Hi, name" greeting
        const greet = document.createElement("span");
        greet.className = "nav-user";
        greet.textContent = `Hi, ${firstName}`;
        nav.appendChild(greet);

        // Add logout button
        const logoutBtn = document.createElement("button");
        logoutBtn.className = "nav-logout";
        logoutBtn.type = "button";
        logoutBtn.textContent = "Log Out";
        logoutBtn.addEventListener("click", async () => {
            logoutBtn.disabled = true;
            logoutBtn.textContent = "Logging out...";
            try {
                await fetch("/api/logout", {
                    method: "POST",
                    credentials: "same-origin",
                });
            } catch {}
            window.location.href = "/";
        });
        nav.appendChild(logoutBtn);
    }

    function renderLoggedOut(nav) {
        // Only add Sign Up if not already present
        const hasSignup = Array.from(nav.querySelectorAll("a")).some(
            a => (a.getAttribute("href") || "").includes("signup.html")
        );
        const hasLogin = Array.from(nav.querySelectorAll("a")).some(
            a => (a.getAttribute("href") || "").includes("login.html")
        );

        if (!hasLogin) {
            const loginLink = document.createElement("a");
            loginLink.href = "/login.html";
            loginLink.textContent = "Log In";
            nav.appendChild(loginLink);
        }

        if (!hasSignup) {
            const signupLink = document.createElement("a");
            signupLink.href = "/signup.html";
            signupLink.className = "nav-signup";
            signupLink.textContent = "Sign Up";
            nav.appendChild(signupLink);
        }
    }
});
