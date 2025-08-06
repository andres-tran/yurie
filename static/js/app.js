let currentModel = 'text';
let currentModelId = 'gpt-4.1';
let isGenerating = false;
let markdownIt = null;
let conversationHistory = []; // Store conversation history client-side

// Model-specific suggestions
const modelSuggestions = {
    'text:gpt-4.1': [
        { text: 'explain quantum computing', full: 'Explain quantum computing in simple terms' },
        { text: 'write a python function', full: 'Write a Python function to calculate fibonacci numbers' },
        { text: 'summarize ai ethics', full: 'Summarize the key principles of AI ethics' }
    ],
    'text:claude-4-sonnet': [
        { text: 'analyze a paradox', full: 'Analyze the grandfather paradox in time travel' },
        { text: 'write a haiku', full: 'Write a haiku about artificial intelligence' },
        { text: 'creative story opening', full: 'Write a creative opening for a sci-fi story' }
    ],
    'image:seedream-3': [
        { text: 'cyberpunk cityscape', full: 'Generate a cyberpunk cityscape at night' },
        { text: 'fantasy creature', full: 'Create a mystical fantasy creature in a forest' },
        { text: 'abstract art', full: 'Generate abstract art with vibrant colors' }
    ],
    'image:imagen-4-ultra': [
        { text: 'photorealistic portrait', full: 'Create a photorealistic portrait of a futuristic astronaut' },
        { text: 'nature landscape', full: 'Generate a stunning mountain landscape at golden hour' },
        { text: 'architectural marvel', full: 'Design a modern architectural building with glass facades' }
    ]
};

// PWA Detection
let isPWA = false;
let isOnline = navigator.onLine;

// Check if running as PWA
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
    isPWA = true;
    document.body.classList.add('pwa-mode');
}

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded (in case script loads after DOM)
    initializeApp();
}

function initializeApp() {
    console.log('Initializing app...');
    console.log('DOM ready state:', document.readyState);
    console.log('Running as PWA:', isPWA);
    console.log('Online status:', isOnline);
    
    setupTheme();
    setupMarkdownRenderer();
    setupModelSelector();
    setupInputHandlers();
    setupMobileOptimizations();
    setupNativeInteractions();
    setupOfflineHandling();
    setupUpdateNotifications();
    updateSuggestions(); // Update suggestions based on initial model
    
    console.log('App initialization complete');
}

// Setup native macOS/iOS interactions
function setupNativeInteractions() {
    // Add context menu support
    setupContextMenus();
    
    // Add scale animations to buttons
    setupButtonAnimations();
    
    // Prevent unwanted text selection
    document.addEventListener('selectstart', (e) => {
        const isTextInput = e.target.matches('input, textarea, .message-content, .message-content *');
        if (!isTextInput) {
            e.preventDefault();
        }
    });
}

// Setup context menus
function setupContextMenus() {
    // Message context menu
    document.addEventListener('contextmenu', (e) => {
        const messageContent = e.target.closest('.message-content');
        if (messageContent) {
            e.preventDefault();
            showMessageContextMenu(e, messageContent);
        }
    });
}

// Show message context menu
function showMessageContextMenu(e, messageContent) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    
    // Position menu to avoid going off-screen
    const menuWidth = 150; // Approximate width
    const menuHeight = 80; // Approximate height
    
    let x = e.pageX;
    let y = e.pageY;
    
    // Check if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
    }
    
    // Check if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    const menuItems = [
        { label: 'Copy', action: () => copyMessageContent(messageContent) },
        { label: 'Select All', action: () => selectAllContent(messageContent) }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
            item.action();
            menu.remove();
        };
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Remove menu on click outside
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });
    }, 0);
}

// Copy message content
function copyMessageContent(messageContent) {
    const text = messageContent.textContent;
    navigator.clipboard.writeText(text);
}

// Select all content
function selectAllContent(messageContent) {
    const range = document.createRange();
    range.selectNodeContents(messageContent);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Setup button animations
function setupButtonAnimations() {
    // Use event delegation for better performance and dynamic buttons
    document.addEventListener('mousedown', (e) => {
        const button = e.target.closest('button, .suggestion');
        if (button) {
            button.style.transform = 'scale(0.96)';
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        const button = e.target.closest('button, .suggestion');
        if (button) {
            button.style.transform = 'scale(1)';
        }
    });
    
    // Use event delegation with mouseout instead of mouseleave
    document.addEventListener('mouseout', (e) => {
        if (e.target && e.target.closest) {
            const button = e.target.closest('button, .suggestion');
            if (button && !button.contains(e.relatedTarget)) {
                button.style.transform = 'scale(1)';
            }
        }
    });
}

// Setup theme management
function setupTheme() {
    // Check for saved theme preference or default to dark for minimal design
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update syntax highlighting theme
    updateSyntaxHighlightingTheme(theme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update syntax highlighting theme
    updateSyntaxHighlightingTheme(newTheme);
}

// Update syntax highlighting theme
function updateSyntaxHighlightingTheme(theme) {
    // Minimal design uses a single dark theme for syntax highlighting
    // No need to switch themes
}

// Setup markdown renderer
function setupMarkdownRenderer() {
    // Initialize markdown-it with options
    markdownIt = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true,
        highlight: function(str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return '<pre class="hljs"><code>' +
                           hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                           '</code></pre>';
                } catch (__) {}
            }
            return '<pre class="hljs"><code>' + markdownIt.utils.escapeHtml(str) + '</code></pre>';
        }
    });
    
    // Note: Common languages are already included in the highlight.js bundle
}

// Model selector setup
function setupModelSelector() {
    const modelSelector = document.getElementById('modelSelector');
    
    // Load saved model preference
    const savedSelection = localStorage.getItem('selectedModel') || 'text:gpt-4.1';
    
    // Parse the saved selection
    const [type, id] = savedSelection.split(':');
    currentModel = type;
    currentModelId = id || (type === 'text' ? 'gpt-4.1' : 'seedream-3');
    
    // Set the selector value
    modelSelector.value = savedSelection;
    
    modelSelector.addEventListener('change', (e) => {
        if (isGenerating) return;
        
        const [type, id] = e.target.value.split(':');
        currentModel = type;
        currentModelId = id;
        
        // Save model preference
        localStorage.setItem('selectedModel', e.target.value);
        
        // Update suggestions for the new model
        updateSuggestions();
    });
}

// Input handlers
function setupInputHandlers() {
    const input = document.getElementById('messageInput');
    const form = document.querySelector('.input-wrapper');
    const sendButton = document.querySelector('.send-btn');
    
    // Debug log to check if elements exist
    console.log('Setting up input handlers:');
    console.log('  - Input element:', input);
    console.log('  - Form element:', form);
    console.log('  - Send button:', sendButton);
    console.log('  - All elements found:', !!input && !!form && !!sendButton);
    
    if (!input || !form || !sendButton) {
        console.error('Missing required elements for input handlers');
        console.error('  - messageInput missing:', !input);
        console.error('  - input-wrapper missing:', !form);
        console.error('  - send-btn missing:', !sendButton);
        
        // Try to find elements with different selectors
        console.log('Attempting alternative selectors:');
        console.log('  - Button by ID sendButton:', !!document.getElementById('sendButton'));
        console.log('  - All buttons:', document.querySelectorAll('button'));
        return;
    }

    // Set initial send button state based on input content
    sendButton.disabled = input.value.trim() === '';
    console.log('Initial send button disabled state:', sendButton.disabled);
    
    // Handle input changes
    input.addEventListener('input', () => {
        autoResizeTextarea(input);
        sendButton.disabled = input.value.trim() === '';
        console.log('Input changed, button disabled:', sendButton.disabled);
    });
    
    // Handle key press events
    input.addEventListener('keydown', handleKeyPress);
    
    // Handle form submission (for accessibility/Enter key)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Form submitted'); // Debug log
        sendMessage();
        return false;
    });
    
    // Handle send button click
    sendButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Send button clicked'); // Debug log
        sendMessage();
    });
    
    console.log('Event listeners attached successfully');
    
    // Also trigger auto-resize on load in case there's existing text
    autoResizeTextarea(input);
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    // Save current scroll position
    const scrollPos = document.getElementById('messagesContainer').scrollTop;
    
    // Reset height to calculate new scrollHeight
    textarea.style.height = 'auto';
    
    // Detect if mobile
    const isMobile = window.innerWidth <= 768;
    
    // Set new height with min and max limits
    const minHeight = isMobile ? 44 : 80; // Different min height for mobile
    const maxHeight = isMobile ? 100 : 180; // Different max height for mobile
    const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
    
    // Restore scroll position
    document.getElementById('messagesContainer').scrollTop = scrollPos;
}

// Handle key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message
async function sendMessage() {
    console.log('sendMessage called'); // Debug log
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    console.log('Message:', message, 'isGenerating:', isGenerating); // Debug log
    
    if (!message || isGenerating) return;
    
    isGenerating = true;
    
    // Haptic feedback on mobile
    triggerHapticFeedback('light');
    
    // Clear input
    input.value = '';
    autoResizeTextarea(input);
    
    // Disable send button after clearing input
    const sendButton = document.querySelector('.send-btn');
    if (sendButton) {
        sendButton.disabled = true;
    }
    
    // Remove welcome message with fade animation
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => welcomeMessage.remove(), 300);
    }
    
    // Add user message
    addMessage(message, 'user');
    
    // Add user message to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Add assistant placeholder
    const assistantMessageId = 'msg-' + Date.now();
    addMessage('', 'assistant', assistantMessageId);
    
    try {
        // Debug log to check model type
        console.log('Sending request with model:', currentModel);
        console.log('Conversation history length:', conversationHistory.length);
        
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',  // Include cookies in the request
            body: JSON.stringify({
                message: message,
                model_type: currentModel,
                model_id: currentModelId,
                conversation_history: conversationHistory  // Send conversation history
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText || 'Failed to get response'}`);
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'start') {
                            updateMessage(assistantMessageId, createTypingIndicator());
                        } else if (data.type === 'content') {
                            assistantMessage += data.content;
                            updateMessage(assistantMessageId, assistantMessage, true);
                        } else if (data.type === 'image') {
                            const imageHtml = `<img src="${data.content}" alt="Generated image" />`;
                            updateMessage(assistantMessageId, imageHtml);
                            // Store image generation in history
                            assistantMessage = `[Generated image: ${message}]`;
                        } else if (data.type === 'error') {
                            updateMessage(assistantMessageId, `Error: ${data.error}`);
                        } else if (data.type === 'progress') {
                            updateMessage(assistantMessageId, createTypingIndicator() + `<p>${data.message}</p>`);
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }
        
        // Add assistant's response to conversation history
        if (assistantMessage) {
            conversationHistory.push({
                role: 'assistant',
                content: assistantMessage
            });
            console.log('Added assistant response to history. Total messages:', conversationHistory.length);
        }
        
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'Sorry, an error occurred while generating the response.';
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Server error')) {
            errorMessage = error.message;
        }
        
        updateMessage(assistantMessageId, errorMessage);
    } finally {
        isGenerating = false;
        
        // Re-enable send button if there's text in the input
        const input = document.getElementById('messageInput');
        const sendButton = document.querySelector('.send-btn');
        if (sendButton && input) {
            sendButton.disabled = input.value.trim() === '';
        }
    }
}

// Add message to chat
function addMessage(content, sender, id) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (id) messageDiv.id = id;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (sender === 'user') {
        // For user messages, escape HTML to prevent injection
        contentDiv.textContent = content;
    } else {
        contentDiv.innerHTML = sender === 'assistant' && !content ? createTypingIndicator() : content;
    }
    
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    
    // Ensure message is visible, accounting for mobile input
    ensureMessageVisible(messageDiv, container);
}

// Smooth scroll to bottom
function smoothScrollToBottom(container) {
    const scrollHeight = container.scrollHeight;
    const height = container.clientHeight;
    const maxScrollTop = scrollHeight - height;
    const duration = 300;
    
    const startScrollTop = container.scrollTop;
    const distance = maxScrollTop - startScrollTop;
    let startTime = null;
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        container.scrollTop = startScrollTop + (distance * easeOutCubic(progress));
        
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }
    
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    requestAnimationFrame(animation);
}

// Update message content
function updateMessage(id, content, isMarkdown = false) {
    const message = document.getElementById(id);
    if (message) {
        const contentDiv = message.querySelector('.message-content');
        
        if (isMarkdown && markdownIt) {
            // Render markdown content
            contentDiv.innerHTML = markdownIt.render(content);
            
            // Apply copy button to code blocks
            addCopyButtons(contentDiv);
        } else {
            contentDiv.innerHTML = content;
        }
        
        const container = document.getElementById('messagesContainer');
        
        // Force a reflow to ensure the DOM is updated
        message.offsetHeight;
        
        // Ensure the message is visible on mobile
        ensureMessageVisible(message, container);
    }
}

// Ensure message is visible above input area
function ensureMessageVisible(message, container) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Get the input container height
        const inputContainer = document.querySelector('.input-container');
        const inputHeight = inputContainer ? inputContainer.offsetHeight : 100;
        
        // Scroll to show the message with extra padding
        const messageBottom = message.offsetTop + message.offsetHeight;
        const containerHeight = container.clientHeight;
        const currentScroll = container.scrollTop;
        const visibleBottom = currentScroll + containerHeight;
        
        // If message extends beyond visible area, scroll to show it
        if (messageBottom > visibleBottom - inputHeight - 20) {
            const targetScroll = messageBottom - containerHeight + inputHeight + 40;
            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    } else {
        // For desktop, use the standard smooth scroll
        smoothScrollToBottom(container);
    }
}

// Add copy buttons to code blocks
function addCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        const pre = block.parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"></path></svg>';
        copyBtn.title = 'Copy code';
        copyBtn.onclick = () => copyToClipboard(block.textContent, copyBtn);
        wrapper.appendChild(copyBtn);
    });
}

// Copy to clipboard function
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"></path></svg>';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"></path></svg>';
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Create typing indicator
function createTypingIndicator() {
    return `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
}

// Update suggestions based on current model
function updateSuggestions() {
    const suggestionContainers = document.querySelectorAll('.suggestions');
    const modelKey = `${currentModel}:${currentModelId}`;
    const suggestions = modelSuggestions[modelKey] || modelSuggestions['text:gpt-4.1'];
    
    suggestionContainers.forEach(container => {
        container.innerHTML = suggestions.map((suggestion, index) => `
            <button class="suggestion" onclick="sendSuggestion('${suggestion.full}')" aria-label="Send suggestion: ${suggestion.text}">
                ${suggestion.text}
            </button>
        `).join('');
    });
}

// Send suggestion
function sendSuggestion(text) {
    const input = document.getElementById('messageInput');
    
    input.value = text;
    autoResizeTextarea(input);
    
    // Just send the message with the current model
    sendMessage();
}

// New chat
async function newChat() {
    if (isGenerating) return;
    
    // Haptic feedback
    triggerHapticFeedback('medium');
    
    // Animate button
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        animateButtonPress(newChatBtn);
    }
    
    const container = document.getElementById('messagesContainer');
    
    // Fade out existing messages
    container.style.opacity = '0';
    
    // Clear conversation history
    conversationHistory = [];
    console.log('Conversation history cleared');
    
    // Clear conversation history on server (kept for compatibility)
    try {
        await fetch('/clear-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'  // Include cookies in the request
        });
    } catch (error) {
        console.error('Error clearing history:', error);
    }
    
    // After fade animation, replace content
    setTimeout(() => {
        const modelKey = `${currentModel}:${currentModelId}`;
        const suggestions = modelSuggestions[modelKey] || modelSuggestions['text:gpt-4.1'];
        
        container.innerHTML = `
            <div class="welcome-message">
                <h2>welcome to yurie</h2>
                <p>select a model and start chatting. generate text or create images.</p>
                <div class="suggestions" role="group" aria-label="Suggested prompts">
                    ${suggestions.map(suggestion => `
                        <button class="suggestion" onclick="sendSuggestion('${suggestion.full}')" aria-label="Send suggestion: ${suggestion.text}">
                            ${suggestion.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        container.style.opacity = '1';
    }, 200);
}

// Setup mobile optimizations
function setupMobileOptimizations() {
    // Check if on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Handle viewport height changes (keyboard open/close)
        let viewportHeight = window.innerHeight;
        
        // Use Visual Viewport API if available
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                const currentHeight = window.visualViewport.height;
                const input = document.getElementById('messageInput');
                const container = document.getElementById('messagesContainer');
                
                // Keyboard is likely open if height decreased significantly
                if (currentHeight < viewportHeight * 0.75) {
                    document.body.classList.add('keyboard-open');
                    // Ensure last message is visible
                    const lastMessage = container.querySelector('.message:last-child');
                    if (lastMessage) {
                        ensureMessageVisible(lastMessage, container);
                    }
                } else {
                    document.body.classList.remove('keyboard-open');
                }
                
                viewportHeight = currentHeight;
            });
        } else {
            // Fallback for browsers without Visual Viewport API
            window.addEventListener('resize', () => {
                const currentHeight = window.innerHeight;
                const input = document.getElementById('messageInput');
                
                // Keyboard is likely open if height decreased significantly
                if (currentHeight < viewportHeight * 0.75) {
                    document.body.classList.add('keyboard-open');
                    // Scroll to bottom to keep input visible
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100);
                } else {
                    document.body.classList.remove('keyboard-open');
                }
                
                viewportHeight = currentHeight;
            });
        }
        
        // Prevent double-tap zoom on buttons
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Fix iOS input focus issues
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('touchstart', (e) => {
            e.target.focus();
        });
        
        // Add swipe gesture support for new chat
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        });
        
        function handleSwipeGesture() {
            const swipeThreshold = 100;
            const swipeDistance = touchEndX - touchStartX;
            
            // Swipe right to clear chat
            if (swipeDistance > swipeThreshold && touchStartX < 50) {
                newChat();
            }
        }
        
        // Improve scrolling performance
        const messagesContainer = document.getElementById('messagesContainer');
        let ticking = false;
        
        function updateScrollPerformance() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Add momentum scrolling on iOS
                    messagesContainer.style.webkitOverflowScrolling = 'touch';
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        messagesContainer.addEventListener('scroll', updateScrollPerformance, { passive: true });
    }
}

// Add haptic feedback for mobile (if supported)
function triggerHapticFeedback(style = 'light') {
    if ('vibrate' in navigator) {
        switch(style) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'heavy':
                navigator.vibrate(30);
                break;
        }
    }
}

// Animate button press
function animateButtonPress(button) {
    button.style.transform = 'scale(0.96)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

// Setup offline handling
function setupOfflineHandling() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('App is online');
        showNotification('Back online', 'success');
        
        // Remove offline indicator
        document.body.classList.remove('offline');
        
        // Re-enable send button if there's text
        const input = document.getElementById('messageInput');
        const sendButton = document.querySelector('.send-btn');
        if (sendButton && input && input.value.trim()) {
            sendButton.disabled = false;
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('App is offline');
        showNotification('You are offline. Some features may be limited.', 'warning');
        
        // Add offline indicator
        document.body.classList.add('offline');
        
        // Disable send button
        const sendButton = document.querySelector('.send-btn');
        if (sendButton) {
            sendButton.disabled = true;
        }
    });
    
    // Check initial connection status
    if (!isOnline) {
        document.body.classList.add('offline');
        showNotification('You are offline. Some features may be limited.', 'warning');
    }
}

// Setup update notifications
function setupUpdateNotifications() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // A new service worker has taken control
            showNotification('App updated! Refresh to see the latest version.', 'info', {
                action: 'Refresh',
                callback: () => window.location.reload()
            });
        });
    }
}

// Show notification
function showNotification(message, type = 'info', options = {}) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        ${options.action ? `<button class="notification-action">${options.action}</button>` : ''}
        <button class="notification-close" aria-label="Close notification">×</button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('notification-show');
    });
    
    // Handle action button
    if (options.action && options.callback) {
        const actionBtn = notification.querySelector('.notification-action');
        actionBtn.addEventListener('click', () => {
            options.callback();
            removeNotification(notification);
        });
    }
    
    // Handle close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
    
    // Auto-remove after 5 seconds (unless it has an action)
    if (!options.action) {
        setTimeout(() => {
            removeNotification(notification);
        }, 5000);
    }
}

// Remove notification with animation
function removeNotification(notification) {
    if (!notification) return;
    
    notification.classList.remove('notification-show');
    notification.addEventListener('transitionend', () => {
        notification.remove();
    });
}
