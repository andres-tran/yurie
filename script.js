document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const themeToggle = document.querySelector('.theme-toggle');
    const suggestionChips = document.querySelectorAll('.chip');

    // Perplexity API Configuration
    const PERPLEXITY_API_KEY = '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';
    const API_URL = 'https://api.perplexity.ai/chat/completions';

    // Search history and popular queries for predictive search
    let searchHistory = [];
    let isSearching = false;
    const popularQueries = [
        "What's new in AI?",
        "How to learn programming",
        "Best tech innovations",
        "Future of artificial intelligence",
        "Machine learning basics"
    ];

    // Theme Toggle with localStorage persistence
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }

    // Enhanced Predictive Search
    const createPredictiveSearch = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'predictive-search';
        wrapper.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-top: none;
            border-radius: 0 0 1rem 1rem;
            box-shadow: var(--shadow-md);
            max-height: 300px;
            overflow-y: auto;
            display: none;
            z-index: 1000;
        `;
        searchInput.parentElement.style.position = 'relative';
        searchInput.parentElement.appendChild(wrapper);
        return wrapper;
    };

    const predictiveSearchWrapper = createPredictiveSearch();

    const updatePredictiveSearch = (query) => {
        if (!query) {
            predictiveSearchWrapper.style.display = 'none';
            return;
        }

        const queryLower = query.toLowerCase();
        
        // Combine history and popular queries, prioritizing matches
        const historyMatches = searchHistory
            .filter(item => item.toLowerCase().includes(queryLower))
            .slice(0, 3);
        
        const popularMatches = popularQueries
            .filter(item => 
                item.toLowerCase().includes(queryLower) && 
                !historyMatches.includes(item)
            )
            .slice(0, 3);

        const matches = [...historyMatches, ...popularMatches];

        if (matches.length === 0) {
            predictiveSearchWrapper.style.display = 'none';
            return;
        }

        predictiveSearchWrapper.innerHTML = matches
            .map((match, index) => `
                <div class="predictive-item" style="
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    display: flex;
                    align-items: center;
                ">
                    <i class="fas ${index < historyMatches.length ? 'fa-history' : 'fa-trending-up'}" 
                       style="margin-right: 0.5rem; color: #6b7280;"></i>
                    ${match}
                </div>
            `)
            .join('');

        predictiveSearchWrapper.style.display = 'block';

        const items = predictiveSearchWrapper.querySelectorAll('.predictive-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--hover-color)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            item.addEventListener('click', () => {
                searchInput.value = item.textContent.trim();
                predictiveSearchWrapper.style.display = 'none';
                handleSearch();
            });
        });
    };

    // Process markdown-style formatting
    const processMarkdown = (text) => {
        return text
            // Process bold text (**text**)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Process headers (##)
            .replace(/##\s+([^\n]+)/g, '<h2>$1</h2>')
            // Process existing markdown
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    };

    // Search Functionality
    const handleSearch = async () => {
        const query = searchInput.value.trim();
        if (!query || isSearching) return;

        isSearching = true;
        predictiveSearchWrapper.style.display = 'none';

        // Add to search history
        if (!searchHistory.includes(query)) {
            searchHistory.unshift(query);
            if (searchHistory.length > 10) searchHistory.pop();
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        }

        // Update button state
        searchButton.disabled = true;
        searchButton.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Searching...</span>
        `;

        // Show loading state
        resultsContainer.innerHTML = `
            <div class="result-card">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="loading-spinner">
                        <i class="fas fa-circle-notch fa-spin"></i>
                    </div>
                    <p>Searching for "${query}"...</p>
                </div>
            </div>
        `;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an advanced AI assistant that communicates in a natural, engaging way while maintaining clarity and accuracy. Your responses should:

- Feel conversational and friendly, as if having a dialogue
- Use natural transitions and flow between ideas
- Include occasional rhetorical questions to engage the reader
- Express enthusiasm about interesting concepts
- Acknowledge uncertainty when appropriate
- Use analogies and examples to explain complex ideas
- Maintain a warm, approachable tone while being informative

Format your responses using:
- ## for section headers
- ** for bold text
- Use semantic HTML for other formatting:
  - <ul>/<ol> for lists
  - <code> for technical terms
  - <pre> for code blocks
  - Separate paragraphs with line breaks

Remember to sound genuinely interested in the topic and create an engaging dialogue with the user.`
                        },
                        {
                            role: 'user',
                            content: query
                        }
                    ]
                })
            });

            const data = await response.json();
            const answer = data.choices[0].message.content;

            // Process the answer with enhanced markdown support
            const processedAnswer = processMarkdown(answer);

            resultsContainer.innerHTML = `
                <div class="result-card slide-in">
                    <h2 class="fade-in">Results for "${query}"</h2>
                    <div class="response-content fade-in-delayed">
                        <p>${processedAnswer}</p>
                    </div>
                    <div class="feedback-section fade-in-delayed">
                        <p>Was this response helpful?</p>
                        <div class="feedback-buttons">
                            <button class="feedback-btn" data-value="helpful">
                                <i class="fas fa-thumbs-up"></i>
                                Helpful
                            </button>
                            <button class="feedback-btn" data-value="not-helpful">
                                <i class="fas fa-thumbs-down"></i>
                                Not Helpful
                            </button>
                        </div>
                    </div>
                    <div class="result-sources">
                        <span class="source-info">
                            <i class="fas fa-info-circle"></i>
                            Powered by Perplexity AI
                        </span>
                        <span class="source-info">
                            <i class="fas fa-clock"></i>
                            ${new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            `;

            // Add feedback button handlers
            const feedbackButtons = document.querySelectorAll('.feedback-btn');
            feedbackButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const value = this.dataset.value;
                    feedbackButtons.forEach(btn => btn.disabled = true);
                    this.classList.add('selected');
                    
                    // Store feedback in localStorage
                    const feedbackData = JSON.parse(localStorage.getItem('feedback') || '{}');
                    feedbackData[query] = value;
                    localStorage.setItem('feedback', JSON.stringify(feedbackData));

                    // Show thank you message
                    const feedbackSection = this.closest('.feedback-section');
                    feedbackSection.innerHTML = `
                        <p class="feedback-thanks">
                            <i class="fas fa-check-circle"></i>
                            Thank you for your feedback!
                        </p>
                    `;
                });
            });

        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `
                <div class="result-card error">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${error.message || 'Sorry, there was an error processing your request. Please try again.'}</p>
                    </div>
                </div>
            `;
        } finally {
            isSearching = false;
            searchButton.disabled = false;
            searchButton.innerHTML = `
                <i class="fas fa-search"></i>
                <span>Search</span>
            `;
        }
    };

    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
    }

    // Event Listeners
    searchButton.addEventListener('click', handleSearch);
    
    searchInput.addEventListener('input', (e) => {
        updatePredictiveSearch(e.target.value.trim());
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        } else if (e.key === '/' && e.target.value === '') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Handle suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            searchInput.value = chip.textContent;
            handleSearch();
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Press '/' to focus search
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        // Press 'Escape' to clear search
        else if (e.key === 'Escape') {
            searchInput.value = '';
            predictiveSearchWrapper.style.display = 'none';
            searchInput.blur();
        }
    });

    // Click outside to close predictive search
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            predictiveSearchWrapper.style.display = 'none';
        }
    });

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // Initial focus on search input
    searchInput.focus();
});