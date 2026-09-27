/**
 * AdmitPak — Draggable floating buttons with smart snap-back
 * - Drag anywhere
 * - Drop near original spot → snaps exactly back to CSS-defined default position
 * - Position saved to localStorage
 */

(function () {
    const STORAGE_PREFIX = "admitpak_float_pos_";
    const DRAG_THRESHOLD = 5;
    const SNAP_RADIUS = 130;

    // Clear all inline positioning so CSS controls the button again
    function clearInlinePosition(el) {
        el.style.left = "";
        el.style.top = "";
        el.style.right = "";
        el.style.bottom = "";
        el.style.position = "";
    }

    // Get the button's CSS-default position by temporarily clearing inline styles
    function getDefaultRect(el) {
        const wasFixed = el.style.position === "fixed";
        // Save any inline overrides
        const saved = {
            left: el.style.left,
            top: el.style.top,
            right: el.style.right,
            bottom: el.style.bottom,
            position: el.style.position
        };

        // Clear inline styles to let CSS apply
        clearInlinePosition(el);

        // Measure with no transform
        const prevTransform = el.style.transform;
        el.style.transform = "none";
        const rect = el.getBoundingClientRect();
        el.style.transform = prevTransform;

        // Restore inline overrides if they existed
        if (wasFixed) {
            el.style.position = saved.position;
            el.style.left = saved.left;
            el.style.top = saved.top;
            el.style.right = saved.right;
            el.style.bottom = saved.bottom;
        }

        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }

    function positionElement(el, x, y) {
        const rect = el.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const maxX = window.innerWidth - w - 8;
        const maxY = window.innerHeight - h - 8;
        const clampedX = Math.max(8, Math.min(x, maxX));
        const clampedY = Math.max(8, Math.min(y, maxY));

        el.style.position = "fixed";
        el.style.left = clampedX + "px";
        el.style.top = clampedY + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
    }

    function makeDraggable(el, key) {
        if (!el || el.dataset.draggableAttached === "true") return;
        el.dataset.draggableAttached = "true";

        // Capture the true CSS-default position ONCE at attach time
        const defaultRect = getDefaultRect(el);

        let isDragging = false;
        let hasMoved = false;
        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;

        // Restore saved position (if any)
        try {
            const saved = localStorage.getItem(STORAGE_PREFIX + key);
            if (saved) {
                const pos = JSON.parse(saved);
                if (typeof pos.x === "number" && typeof pos.y === "number") {
                    positionElement(el, pos.x, pos.y);
                }
            }
        } catch {}

        function getPointer(e) {
            if (e.touches && e.touches[0]) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        }

        function onPointerDown(e) {
            if (e.button && e.button !== 0) return;
            const p = getPointer(e);
            const rect = el.getBoundingClientRect();
            startX = p.x;
            startY = p.y;
            currentX = rect.left;
            currentY = rect.top;
            isDragging = true;
            hasMoved = false;
            document.body.style.userSelect = "none";
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const p = getPointer(e);
            const dx = p.x - startX;
            const dy = p.y - startY;
            if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            hasMoved = true;
            positionElement(el, currentX + dx, currentY + dy);
            if (e.cancelable) e.preventDefault();
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = "";
            if (!hasMoved) return;

            const rect = el.getBoundingClientRect();
            const finalX = rect.left;
            const finalY = rect.top;

            // Compare against the true CSS-default rect
            const distFromHome = Math.hypot(
                finalX - defaultRect.x,
                finalY - defaultRect.y
            );

            if (distFromHome <= SNAP_RADIUS) {
                // Clear inline styles → CSS returns it to natural position
                clearInlinePosition(el);
                el.style.transition = "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
                // Small delay to let transition apply
                requestAnimationFrame(() => {
                    // Force a reflow so the transition sees the cleared values
                    void el.offsetWidth;
                });
                setTimeout(() => { el.style.transition = ""; }, 350);
                try { localStorage.removeItem(STORAGE_PREFIX + key); } catch {}
            } else {
                try {
                    localStorage.setItem(
                        STORAGE_PREFIX + key,
                        JSON.stringify({ x: finalX, y: finalY })
                    );
                } catch {}
            }

            // Block the click after a drag
            const blockClick = (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                el.removeEventListener("click", blockClick, true);
            };
            el.addEventListener("click", blockClick, true);
        }

        el.addEventListener("mousedown", onPointerDown);
        el.addEventListener("touchstart", onPointerDown, { passive: true });
        document.addEventListener("mousemove", onPointerMove);
        document.addEventListener("touchmove", onPointerMove, { passive: false });
        document.addEventListener("mouseup", onPointerUp);
        document.addEventListener("touchend", onPointerUp);
        document.addEventListener("touchcancel", onPointerUp);

        el.style.cursor = "grab";
        el.addEventListener("mousedown", () => { el.style.cursor = "grabbing"; });
        document.addEventListener("mouseup", () => { el.style.cursor = "grab"; });
    }

    function tryAttach() {
        const feedbackBtn = document.getElementById("feedback-fab");
        const tourBtn = document.getElementById("tour-help-btn");
        if (feedbackBtn) makeDraggable(feedbackBtn, "feedback");
        if (tourBtn) makeDraggable(tourBtn, "tour");
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(tryAttach, 400);
        setTimeout(tryAttach, 1200);
        setTimeout(tryAttach, 2200);
    });
})();
