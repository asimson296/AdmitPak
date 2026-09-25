document.addEventListener("DOMContentLoaded", () => {

    const elements = document.querySelectorAll(
        ".universities-section, .find-section, .info-section, " +
        ".universities-list-section, .quick-info-section, " +
        ".university-details-section, .detail-panel, .sidebar-card"
    );

    elements.forEach((element, index) => {
        element.classList.add("reveal-on-scroll");

        if (index % 4 === 1) {
            element.classList.add("reveal-delay-1");
        } else if (index % 4 === 2) {
            element.classList.add("reveal-delay-2");
        } else if (index % 4 === 3) {
            element.classList.add("reveal-delay-3");
        }
    });

    const observer = new IntersectionObserver(
        (entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("revealed");
                    observerInstance.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.01,
            rootMargin: "0px 0px 50px 0px"
        }
    );

    elements.forEach(element => {

        // If the element is already visible on load, reveal immediately.
        const rect = element.getBoundingClientRect();
        const inViewport =
            rect.top < window.innerHeight && rect.bottom > 0;

        if (inViewport) {
            element.classList.add("revealed");
        } else {
            observer.observe(element);
        }
    });

});
