/**
 * AdmitPak — Onboarding Tour
 * Uses Shepherd.js to walk first-time visitors through the site.
 * Tour only shows once per browser (localStorage). User can restart from the "?" button.
 */

(function () {
    const TOUR_KEY = "admitpak_tour_completed_v1";

    function hasCompleted() {
        try { return localStorage.getItem(TOUR_KEY) === "true"; }
        catch { return false; }
    }

    function markCompleted() {
        try { localStorage.setItem(TOUR_KEY, "true"); }
        catch {}
    }

    function resetTour() {
        try { localStorage.removeItem(TOUR_KEY); }
        catch {}
    }

    // ---------- Build the tour ----------

    function buildTour() {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: "admitpak-tour-step",
                scrollTo: { behavior: "smooth", block: "center" },
                cancelIcon: { enabled: true },
                modalOverlayOpeningPadding: 8,
                modalOverlayOpeningRadius: 12
            }
        });

        // ---------- Step 0: Welcome ----------
        tour.addStep({
            id: "welcome",
            title: "👋 Welcome to AdmitPak",
            text: "A 30-second tour to show you around. You can skip anytime.",
            buttons: [
                {
                    text: "Skip",
                    classes: "shepherd-button-secondary",
                    action: tour.cancel
                },
                {
                    text: "Start Tour →",
                    classes: "shepherd-button-primary",
                    action: tour.next
                }
            ]
        });

        // ---------- Step 1: Universities link ----------
        const uniLink = document.querySelector('.main-nav a[href="/universities.html"]') ||
                        document.querySelector('.main-nav a[href*="universities"]');

        if (uniLink) {
            tour.addStep({
                id: "universities-link",
                title: "🎓 Browse Universities",
                text: "Explore Pakistan's top universities — NUST, FAST, LUMS, COMSATS, UET, GIKI and more.",
                attachTo: { element: uniLink, on: "bottom" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 2: Search bar (if on list page) ----------
        const searchBar = document.getElementById("university-search");
        if (searchBar) {
            tour.addStep({
                id: "search",
                title: "🔍 Search & Filter",
                text: "Search by name, filter by status (Open / Closed / Not Announced), and sort however you like.",
                attachTo: { element: searchBar, on: "bottom" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 3: HEC ribbon (universities page only) ----------
        const hecRibbon = document.querySelector(".hec-ribbon");
        if (hecRibbon) {
            tour.addStep({
                id: "hec-badge",
                title: "✅ HEC Recognized",
                text: "Green diagonal ribbons mean the university is HEC-recognized. Click the ribbon to verify on HEC's official list.",
                attachTo: { element: hecRibbon, on: "right" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 4: Track button (university detail page) ----------
        const trackBtn = document.querySelector("[data-track-university]");
        if (trackBtn) {
            tour.addStep({
                id: "track",
                title: "⭐ Track Universities",
                text: "Click Track to save a university to your shortlist. You'll get reminded before its deadlines.",
                attachTo: { element: trackBtn, on: "bottom" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 5: Saved link ----------
        const savedLink = document.querySelector('.main-nav a[href*="saved"]');
        if (savedLink) {
            tour.addStep({
                id: "saved",
                title: "📌 Your Saved List",
                text: "All the universities you track appear here — synced across devices, no matter where you log in.",
                attachTo: { element: savedLink, on: "bottom" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 6: Signup / Login ----------
        const signupLink = document.querySelector('.main-nav a[href*="signup"]');
        const loginLink = document.querySelector('.main-nav a[href*="login"]');

        if (signupLink || loginLink) {
            tour.addStep({
                id: "signup",
                title: "🎯 Free Account",
                text: "Sign up free to track universities. No spam, just deadline reminders.",
                attachTo: {
                    element: signupLink || loginLink,
                    on: "bottom"
                },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Next", classes: "shepherd-button-primary", action: tour.next }
                ]
            });
        }

        // ---------- Step 7: Feedback button ----------
        const feedbackFab = document.getElementById("feedback-fab");
        if (feedbackFab) {
            tour.addStep({
                id: "feedback",
                title: "💬 Send Feedback",
                text: "Found a bug? Want a new feature? Tap this button anytime — we read every message.",
                attachTo: { element: feedbackFab, on: "left" },
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Finish ✓", classes: "shepherd-button-primary", action: tour.complete }
                ]
            });
        } else {
            // If no feedback button, add a plain final step
            tour.addStep({
                id: "finish",
                title: "🎉 You're ready!",
                text: "Start exploring universities. Bookmark AdmitPak — we'll keep the data fresh.",
                buttons: [
                    { text: "Back", classes: "shepherd-button-secondary", action: tour.back },
                    { text: "Finish ✓", classes: "shepherd-button-primary", action: tour.complete }
                ]
            });
        }

        // ---------- Lifecycle ----------
        tour.on("complete", markCompleted);
        tour.on("cancel", markCompleted);

        return tour;
    }

    // ---------- Help button (bottom-left) ----------

    function createHelpButton() {
        if (document.getElementById("tour-help-btn")) return;

        const btn = document.createElement("button");
        btn.id = "tour-help-btn";
        btn.type = "button";
        btn.title = "Take a quick tour of AdmitPak";
        btn.innerHTML = '<span>?</span><small>Tour</small>';
        btn.addEventListener("click", () => {
            resetTour();
            const tour = buildTour();
            tour.start();
        });
        document.body.appendChild(btn);
    }

    // ---------- Auto-start on first visit ----------

    document.addEventListener("DOMContentLoaded", () => {
        createHelpButton();

        // Force-start via URL: ?tour=1
        const forceStart = new URLSearchParams(window.location.search).get("tour") === "1";

        if (forceStart) {
            resetTour();
            setTimeout(() => buildTour().start(), 800);
            return;
        }

        if (hasCompleted()) return;

        // Wait for page to fully settle before showing the tour
        setTimeout(() => {
            const tour = buildTour();
            tour.start();
        }, 1800);
    });

    // Expose for debugging
    window.AdmitPakTour = {
        start: () => { resetTour(); buildTour().start(); },
        reset: resetTour
    };
})();
