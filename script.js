// API configuration with your provided keys
const API_CONFIG = {
  brave: {
    endpoint: "https://api.search.brave.com/res/v1/web/search",
    apiKey: "BSAQrn-lcVnFxP29MfOI5j58n8RXEsj" // Your Brave Search API key
  },
  sonar: {
    endpoint: "https://api.perplexity.ai/sonar",
    apiKey: "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", // Your Perplexity Sonar API key
    model: "sonar-pro"
  }
};

// Optional: simulate environment variable fetching for extra key protection.
const API_KEYS = {
  brave: (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("braveKey") || localStorage.getItem("braveKey") || API_CONFIG.brave.apiKey;
  })(),
  sonar: (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sonarKey") || localStorage.getItem("sonarKey") || API_CONFIG.sonar.apiKey;
  })()
};

// Update API_CONFIG with the fetched keys
API_CONFIG.brave.apiKey = API_KEYS.brave;
API_CONFIG.sonar.apiKey = API_KEYS.sonar;

/**
 * Executes a search by sending the user query to both Brave and Sonar APIs,
 * then rendering the merged results.
 */
async function executeSearch() {
  const query = document.getElementById("searchInput").value;
  if (!query || query.length < 3) return;

  try {
    // Optionally optimize query to reduce API cost
    const optimizedQuery = optimizeQuery(query);

    // Execute both API calls in parallel
    const [braveResults, sonarAnalysis] = await Promise.all([
      fetchBraveResults(optimizedQuery),
      analyzeWithSonar(optimizedQuery)
    ]);

    renderResults(braveResults, sonarAnalysis);
  } catch (error) {
    console.error("Search failed:", error);
  }
}

/**
 * Fetches search results from Brave Search API.
 * @param {string} query - The user query.
 * @returns {Promise<Array>} Array of web search result objects.
 */
async function fetchBraveResults(query) {
  const params = new URLSearchParams({
    q: query,
    count: 20,
    freshness: "pd", // Request fresh results
    result_filter: "web"
  });

  const url = `${API_CONFIG.brave.endpoint}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "X-Subscription-Token": API_CONFIG.brave.apiKey,
      "Accept": "application/json"
    }
  });

  const data = await response.json();
  // Adjust this according to the actual response structure.
  return data.web?.results || [];
}

/**
 * Sends the user query to the Perplexity Sonar API for semantic analysis.
 * @param {string} query - The user query.
 * @returns {Promise<Object>} The AI analysis data.
 */
async function analyzeWithSonar(query) {
  const response = await fetch(API_CONFIG.sonar.endpoint, {
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

  return await response.json();
}

/**
 * Ranks the web results using a simple scoring algorithm based on:
 * - Matching of AI answer content with result title.
 * - Domain quality (e.g. .edu, .gov).
 * - Freshness of the result.
 * @param {Array} webResults - Array of web result objects.
 * @param {Object} aiAnalysis - The AI analysis data from Sonar.
 * @returns {Array} Ranked web results.
 */
function rankResults(webResults, aiAnalysis) {
  return webResults
    .map(result => {
      let score = 0;
      // Boost score if AI answer mentions the result title
      if (aiAnalysis.choices && aiAnalysis.choices[0].message.content.includes(result.title))
        score += 0.3;
      // Boost for high-quality domains
      if (result.url.includes(".edu") || result.url.includes(".gov"))
        score += 0.2;
      // Freshness boost based on result date (if available)
      if (result.date) {
        const daysOld = (new Date() - new Date(result.date)) / (1000 * 3600 * 24);
        score += Math.max(0, 1 - daysOld / 30);
      }
      return { ...result, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Renders the AI analysis and ranked web search results.
 * @param {Array} webResults - Array of web result objects.
 * @param {Object} sonarData - The AI analysis data from Sonar.
 */
function renderResults(webResults, sonarData) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  // Render AI analysis if available
  if (sonarData.choices && sonarData.choices.length > 0) {
    const aiDiv = document.createElement("div");
    aiDiv.className = "result-card ai-answer";
    aiDiv.innerHTML = `
      <h3>AI Analysis</h3>
      <p>${sonarData.choices[0].message.content}</p>
      <div class="citations">
        ${sonarData.choices[0].sources
          ? sonarData.choices[0].sources
              .map(s => `<a href="${s.url}" target="_blank">${s.title}</a>`)
              .join(" | ")
          : ""}
      </div>
    `;
    container.appendChild(aiDiv);
  }

  // Render web results
  const rankedResults = rankResults(webResults, sonarData);
  rankedResults.forEach(result => {
    const resultDiv = document.createElement("div");
    resultDiv.className = "result-card";
    resultDiv.innerHTML = `
      <a href="${result.url}" class="result-title" target="_blank">${result.title}</a>
      <p class="snippet">${result.description || ""}</p>
      <div class="meta">
        <span>${new URL(result.url).hostname}</span>
        <span>${result.date || ""}</span>
      </div>
    `;
    container.appendChild(resultDiv);
  });
}

/**
 * Optimizes the query by removing special characters and limiting its length.
 * @param {string} query - The original query.
 * @returns {string} The optimized query.
 */
function optimizeQuery(query) {
  return query.replace(/[^\w\s]/gi, "").substring(0, 150);
}

/* ---------------------------------------------
   PERFORMANCE OPTIMIZATIONS
--------------------------------------------- */

// Basic in-memory caching to reduce duplicate API calls.
const cache = new Map();
async function cachedFetch(url, options) {
  const key = url + JSON.stringify(options.body || "");
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(url, options);
  const data = await response.json();
  cache.set(key, data);
  return data;
}

// Debounce user input to limit API calls.
let timeoutId;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (e.target.value.length > 3) {
      executeSearch();
    }
  }, 300);
});