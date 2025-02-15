document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modelSelect = document.querySelector('.model-button');
    const modelIcon = modelSelect.querySelector('svg');
    const modelName = modelSelect.querySelector('span');
    const newThreadButton = document.querySelector('.new-thread');
    const API_KEY = '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';
    const API_ENDPOINT = 'https://api.perplexity.ai/chat/completions';

    // Model configurations
    const MODELS = {
        'sonar': {
            name: 'Auto',
            description: 'Balanced speed and quality (127k context)',
            systemPrompt: 'Be precise and concise.',
            maxTokens: 1024,
            contextLength: 127000,
            icon: `<path d="M12 2L4 10L12 18L20 10L12 2Z" stroke="currentColor" stroke-width="2"/>
                   <path d="M4 22L12 14L20 22" stroke="currentColor" stroke-width="2"/>`
        },
        'sonar-pro': {
            name: 'Pro',
            description: 'Enhanced capabilities (200k context)',
            systemPrompt: 'Provide detailed, well-reasoned responses.',
            maxTokens: 2048,
            contextLength: 200000,
            icon: `<path d="M12 2L4 10L12 18L20 10L12 2Z" stroke="currentColor" stroke-width="2"/>
                   <path d="M4 22L12 14L20 22" stroke="currentColor" stroke-width="2"/>
                   <circle cx="12" cy="10" r="2" fill="currentColor"/>`
        },
        'sonar-reasoning': {
            name: 'Reasoning',
            description: 'Step-by-step explanations (127k context)',
            systemPrompt: 'Break down your reasoning step by step, providing clear explanations.',
            maxTokens: 1024,
            contextLength: 127000,
            icon: `<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
        },
        'sonar-reasoning-pro': {
            name: 'Reasoning Pro',
            description: 'Advanced reasoning with CoTs (127k context)',
            systemPrompt: 'Provide detailed chain-of-thought reasoning with step-by-step explanations.',
            maxTokens: 2048,
            contextLength: 127000,
            icon: `<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                   <circle cx="18" cy="12" r="2" fill="currentColor"/>`
        }
    };

    // Keep track of chat history and current model
    let chatHistory = [];
    let currentModel = 'sonar';
    let isProcessing = false;

    // Update model button display
    function updateModelButton(modelId) {
        const model = MODELS[modelId];
        modelIcon.innerHTML = model.icon;
        modelName.textContent = model.name;
    }

    // Handle mobile viewport height
    function setMobileHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    window.addEventListener('resize', setMobileHeight);
    window.addEventListener('orientationchange', setMobileHeight);
    setMobileHeight();

    // Auto-resize textarea with max height based on viewport
    function updateTextareaHeight() {
        userInput.style.height = 'auto';
        const maxHeight = window.innerHeight * 0.3;
        const scrollHeight = Math.min(userInput.scrollHeight, maxHeight);
        userInput.style.height = `${scrollHeight}px`;
    }

    userInput.addEventListener('input', updateTextareaHeight);

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            startNewThread();
        }
        if (e.key === 'Enter' && !e.shiftKey && document.activeElement === userInput) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Model selection dropdown
    modelSelect.addEventListener('click', () => {
        const dropdown = document.createElement('div');
        dropdown.className = 'model-dropdown';
        dropdown.innerHTML = Object.entries(MODELS).map(([id, model]) => `
            <div class="model-option ${id === currentModel ? 'active' : ''}" data-model="${id}">
                <div class="model-name">${model.name}</div>
                <div class="model-description">${model.description}</div>
            </div>
        `).join('');

        document.body.appendChild(dropdown);
        positionDropdown(dropdown, modelSelect);

        // Handle model selection
        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.model-option');
            if (option) {
                const newModel = option.dataset.model;
                if (newModel !== currentModel) {
                    currentModel = newModel;
                    updateModelButton(currentModel);
                    showToast(`Switched to ${MODELS[currentModel].name} model`);
                }
                dropdown.remove();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !modelSelect.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    });

    function positionDropdown(dropdown, button) {
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${rect.bottom + 8}px`;
        dropdown.style.left = `${rect.left}px`;
    }

    // Handle new thread button click
    newThreadButton.addEventListener('click', startNewThread);
    sendButton.addEventListener('click', handleSendMessage);

    function startNewThread() {
        if (isProcessing) return;
        chatHistory = [];
        chatMessages.innerHTML = '';
        userInput.value = '';
        updateTextareaHeight();
        userInput.focus();
        document.querySelector('h1').style.display = 'block';
    }

    function handleSendMessage() {
        if (isProcessing) return;
        const message = userInput.value.trim();
        if (!message) return;

        document.querySelector('h1').style.display = 'none';
        addMessageToUI(message, 'user');
        chatHistory.push({ role: 'user', content: message });

        userInput.value = '';
        updateTextareaHeight();
        userInput.focus();

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading assistant-message';
        loadingDiv.setAttribute('aria-label', 'Loading response');
        loadingDiv.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        isProcessing = true;
        callPerplexityAPI(loadingDiv).finally(() => {
            isProcessing = false;
        });
    }

    function addMessageToUI(content, type, sources = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.setAttribute('role', type === 'user' ? 'note' : 'article');
        
        const formattedContent = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        messageDiv.innerHTML = formattedContent;

        if (type === 'assistant') {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.innerHTML = `
                <button class="action-copy" title="Copy to clipboard" aria-label="Copy message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="action-share" title="Share" aria-label="Share message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 6l-4-4-4 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 2v13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;

            actionsDiv.querySelector('.action-copy').addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    showToast('Copied to clipboard');
                }).catch(() => {
                    showToast('Failed to copy to clipboard');
                });
            });

            actionsDiv.querySelector('.action-share').addEventListener('click', () => {
                if (navigator.share) {
                    navigator.share({
                        title: 'Shared from Perplexity Clone',
                        text: content
                    }).catch(console.error);
                } else {
                    navigator.clipboard.writeText(content).then(() => {
                        showToast('Copied to clipboard for sharing');
                    }).catch(() => {
                        showToast('Failed to copy to clipboard');
                    });
                }
            });

            messageDiv.appendChild(actionsDiv);
        }

        chatMessages.appendChild(messageDiv);

        if (sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'message assistant-message sources';
            sourcesDiv.innerHTML = '<strong>Sources:</strong><br>' + 
                sources.map(source => 
                    `<a href="${source}" target="_blank" rel="noopener noreferrer">${source}</a>`
                ).join('<br>');
            chatMessages.appendChild(sourcesDiv);
        }

        const shouldScroll = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 100;
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.textContent = message;
        document.body.appendChild(toast);

        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    async function callPerplexityAPI(loadingDiv) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: MODELS[currentModel].systemPrompt
                },
                ...chatHistory
            ];

            const requestBody = {
                model: currentModel,
                messages: messages,
                max_tokens: MODELS[currentModel].maxTokens
            };

            console.log('API Request:', requestBody);

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Response:', data);
                throw new Error(data.error?.message || `API Error: ${response.status}`);
            }

            console.log('API Response:', data);
            
            loadingDiv.remove();

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const aiResponse = data.choices[0].message.content;
                addMessageToUI(aiResponse, 'assistant', data.citations || []);
                chatHistory.push({ role: 'assistant', content: aiResponse });
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('Error:', error);
            loadingDiv.remove();
            
            const errorMessage = error.message.includes('API Error') 
                ? `Error: ${error.message}. Please try again.`
                : 'An error occurred while processing your request. Please try again.';
            
            addMessageToUI(errorMessage, 'assistant');
        }
    }

    // Modal functionality
    const signUpButton = document.querySelector('.sign-up-button');
    const loginButton = document.querySelector('.login-button');
    const modal = document.getElementById('sign-in-modal');
    const modalClose = modal.querySelector('.modal-close');
    const modalOverlay = modal.querySelector('.modal-overlay');

    function openModal() {
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    signUpButton.addEventListener('click', openModal);
    loginButton.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
            closeModal();
        }
    });

    if (!('ontouchstart' in window)) {
        userInput.focus();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !('ontouchstart' in window)) {
            userInput.focus();
        }
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Initialize model button
    updateModelButton(currentModel);
});