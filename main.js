// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", () => {
  const toggleAdvancedBtn = document.getElementById("toggle-advanced");
  const advancedOptionsDiv = document.getElementById("advanced-options");
  const searchForm = document.getElementById("search-form");
  const resultsDiv = document.getElementById("results");

  // Toggle the display of advanced options
  toggleAdvancedBtn.addEventListener("click", () => {
    advancedOptionsDiv.classList.toggle("hidden");
  });

  // Handle the search form submission
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent page reload

    // Retrieve search input and advanced filters
    const query = document.getElementById("search-input").value.trim();
    const dateFilter = document.getElementById("date-filter").value;
    const languageFilter = document.getElementById("language-filter").value;

    // For now, simply display the search parameters as a demo.
    // Replace this section with your search logic or API call.
    resultsDiv.innerHTML = `
      <div class="result-item">
        <h3>Results for: ${query}</h3>
        <p><strong>Date Filter:</strong> ${dateFilter || "None"}</p>
        <p><strong>Language Filter:</strong> ${languageFilter || "Any"}</p>
        <p>This is a placeholder result. Integrate your search backend/API here.</p>
      </div>
    `;
  });
});
