async function loadUniversities() {
    const universityList = document.getElementById("university-list");

    try {
        const response = await fetch("/api/universities");

        if (!response.ok) {
            throw new Error("Failed to load universities");
        }

        const universities = await response.json();

        universityList.innerHTML = "";

        universities.forEach((university, index) => {
            const card = document.createElement("article");

            card.className = "university-card";

            card.innerHTML = `
                <div class="university-number">
                    ${String(index + 1).padStart(2, "0")}
                </div>

                <h3>${university.name}</h3>

                <p class="university-location">
                    ${university.city}, ${university.province}
                </p>

                <div class="card-actions">
                    <a
                        href="university.html?slug=${encodeURIComponent(university.slug)}"
                        class="view-link"
                    >
                        View University
                    </a>

                    <a
                        href="${university.officialWebsite}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="official-link"
                    >
                        Official Website
                    </a>
                </div>
            `;

            universityList.appendChild(card);
        });
    } catch (error) {
        console.error(error);

        universityList.innerHTML = `
            <p class="loading">
                Unable to load universities. Please try again.
            </p>
        `;
    }
}

loadUniversities();
