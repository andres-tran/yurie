/****************************************************************************
 * WARNING: For demonstration only. Storing API keys in client code is unsafe
 * for production. Use a server-side proxy or environment variables instead.
 ****************************************************************************/

// Your provided Brave & Perplexity Sonar keys:
const API_KEYS = {
  brave: "BSAQrn-lcVnFxP29MfOI5j58n8RXEsj",
  sonar: "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"
};

// API configuration
const API_CONFIG = {
  brave: {
    endpoint: "https://api.search.brave.com/res/v1/web/search",
    apiKey: API_KEYS.brave
  },
  sonar: {
    endpoint: "https://api.perplexity.ai/sonar",
    apiKey: API_KEYS.sonar,
    model: "sonar-pro"
  }
};

/**
 * Main function that executes a search using Brave + Perplexity Sonar,
 * then renders results to the page.
 */
async function executeSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query || query.length < 3) {
    console.warn("Query must be at least 3 characters.");
    return;
  }

  try {
    // Optionally optimize the query to reduce cost
    const optimizedQuery = optimizeQuery(query);

    // Parallel calls to Brave & Sonar
    const [braveResults, sonarAnalysis] = await Promise.all([
      fetchBraveResults(optimizedQuery),
      analyzeWithSonar(optimizedQuery)
    ]);

    console.log("Brave raw results:", braveResults);
    console.log("Sonar analysis:", sonarAnalysis);

    renderResults(braveResults, sonarAnalysis);
  } catch (error) {
    console.error("Search failed:", error);
  }
}

/**
 * Fetch web results from Brave Search.
 * @param {string} query - The user query.
 * @returns {Array} Array of search results from Brave.
 */
async function fetchBraveResults(query) {
  const params = new URLSearchParams({
    q: query,
    count: 10,       // number of results
    freshness: "pd", // request fresh results
    result_filter: "web"
  });

  const url = `${API_CONFIG.brave.endpoint}?${params.toString()}`;
  const resp = await fetch(url, {
    headers: {
      "X-Subscription-Token": API_CONFIG.brave.apiKey,
      "Accept": "application/json"
    }
  });
  if (!resp.ok) {
    throw new Error(`Brave API error: ${resp.status}`);
  }

  const data = await resp.json();
  // The code assumes data.web.results is an array of objects
  // Adjust if your actual structure differs
  return data.web?.results || [];
}

/**
 * Send query to Perplexity Sonar for AI analysis.
 * @param {string} query - The user query.
 * @returns {Object} AI analysis result.
 */
async function analyzeWithSonar(query) {
  const resp = await fetch(API_CONFIG.sonar.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_CONFIG.sonar.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: API_CONFIG.sonar.model,
      messages: [{ role: "user", content: query }],
      max_tokens: 1000
    })
  });
  if (!resp.ok) {
    throw new Error(`Sonar API error: ${resp.status}`);
  }
  return await resp.json();
}

/**
 * Rank results based on:
 * - Mentions in AI answer
 * - Domain quality (.edu, .gov)
 * - Freshness (if 'date' is available)
 */
function rankResults(webResults, sonarData) {
  let aiText = "";
  if (sonarData?.choices && sonarData.choices.length > 0) {
    aiText = sonarData.choices[0].message.content || "";
  }

  return webResults.map(result => {
    let score = 0;

    // Boost if AI answer references the result title
    if (aiText.includes(result.title)) {
      score += 0.3;
    }

    // Boost for high-quality domain
    if (result.url.includes(".edu") || result.url.includes(".gov")) {
      score += 0.2;
    }

    // Freshness boost if 'date' is available
    if (result.date) {
      const daysOld = (Date.now() - new Date(result.date).getTime()) / (1000 * 3600 * 24);
      // Example: within 30 days => partial boost
      score += Math.max(0, 1 - (daysOld / 30));
    }

    return { ...result, score };
  })
  .sort((a, b) => b.score - a.score);
}

/**
 * Render the AI analysis and the ranked Brave results to the page.
 */
function renderResults(braveResults, sonarData) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  // Create AI analysis card if we have an answer
  if (sonarData?.choices && sonarData.choices.length > 0) {
    const aiCard = document.createElement("div");
    aiCard.className = "result-card ai-answer";

    const aiAnswer = sonarData.choices[0].message.content;
    const sources = sonarData.choices[0].sources || [];

    aiCard.innerHTML = `
      <h3>AI Analysis</h3>
      <p>${aiAnswer}</p>
      <div class="citations">
        ${sources.map(s => `<a href="${s.url}" target="_blank">${s.title}</a>`).join(" | ")}
      </div>
    `;
    container.appendChild(aiCard);
  }

  // If Brave results are empty, show a note
  if (!braveResults || braveResults.length === 0) {
    const noResultsDiv = document.createElement("div");
    noResultsDiv.className = "result-card";
    noResultsDiv.innerHTML = `
      <p>No web results found. Try another query.</p>
    `;
    container.appendChild(noResultsDiv);
    return;
  }

  // Rank & display Brave results
  const ranked = rankResults(braveResults, sonarData);
  console.log("Ranked results:", ranked);

  ranked.forEach(item => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <a href="${item.url}" class="result-title" target="_blank">
        ${item.title}
      </a>
      <p class="snippet">${item.description || ""}</p>
      <div class="meta">
        <span>${(new URL(item.url)).hostname}</span>
        <span>${item.date || ""}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Simple optimization: remove special chars, limit length to 150
 */
function optimizeQuery(query) {
  return query.replace(/[^\w\s]/gi, "").substring(0, 150);
}

/**
 * Debounce user input to reduce API calls
 */
let debounceTimer;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (e.target.value.trim().length >= 3) {
      executeSearch();
    }
  }, 300);
});