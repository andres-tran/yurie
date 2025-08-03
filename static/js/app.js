let currentModel = 'text';
let isGenerating = false;
let markdownIt = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupMarkdownRenderer();
    setupModelSelector();
    setupInputHandlers();
    setupMobileOptimizations();
    setupNativeInteractions();
});

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
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
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
    // Add scale animation to all buttons
    const buttons = document.querySelectorAll('button, .suggestion');
    buttons.forEach(button => {
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.96)';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
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
    
    // Register highlight.js aliases
    hljs.registerAliases(['js'], { languageName: 'javascript' });
    hljs.registerAliases(['py'], { languageName: 'python' });
    hljs.registerAliases(['ts'], { languageName: 'typescript' });
    hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });
}

// Model selector setup
function setupModelSelector() {
    const modelSelector = document.getElementById('modelSelector');
    
    // Load saved model preference
    const savedModel = localStorage.getItem('selectedModel') || 'text';
    currentModel = savedModel;
    modelSelector.value = savedModel;
    
    modelSelector.addEventListener('change', (e) => {
        if (isGenerating) return;
        currentModel = e.target.value;
        // Save model preference
        localStorage.setItem('selectedModel', currentModel);
    });
}

// Input handlers
function setupInputHandlers() {
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    input.addEventListener('input', () => {
        sendButton.disabled = input.value.trim() === '' || isGenerating;
        autoResizeTextarea(input);
    });
    
    // Check and enable send button on page load if there's text
    if (input.value.trim() !== '') {
        sendButton.disabled = false;
    }
    
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
        sendMessage(event);
    }
}

// Send message
async function sendMessage(event) {
    if (event) {
        event.preventDefault();
    }

    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isGenerating) return;
    
    isGenerating = true;
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    
    // Add button animation
    sendButton.classList.add('sending');
    
    // Haptic feedback on mobile
    triggerHapticFeedback('light');
    
    // Scale animation for send button
    animateButtonPress(sendButton);
    
    // Clear input
    input.value = '';
    autoResizeTextarea(input);
    
    // Remove welcome message with fade animation
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => welcomeMessage.remove(), 300);
    }
    
    // Add user message
    addMessage(message, 'user');
    
    // Add assistant placeholder
    const assistantMessageId = 'msg-' + Date.now();
    addMessage('', 'assistant', assistantMessageId);
    
    try {
        // Debug log to check model type
        console.log('Sending request with model:', currentModel);
        
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',  // Include cookies in the request
            body: JSON.stringify({
                message: message,
                model_type: currentModel
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response');
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
        
    } catch (error) {
        console.error('Error:', error);
        updateMessage(assistantMessageId, 'Sorry, an error occurred while generating the response.');
    } finally {
        isGenerating = false;
        sendButton.disabled = false;
        sendButton.classList.remove('sending');
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
    
    // Smooth scroll to bottom
    smoothScrollToBottom(container);
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

// Send suggestion
function sendSuggestion(text) {
    const input = document.getElementById('messageInput');
    const modelSelector = document.getElementById('modelSelector');
    
    input.value = text;
    autoResizeTextarea(input);
    
    // Update model based on suggestion
    if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('cityscape')) {
        currentModel = 'image';
        modelSelector.value = 'image';
        // Save model preference
        localStorage.setItem('selectedModel', 'image');
    } else {
        currentModel = 'text';
        modelSelector.value = 'text';
        // Save model preference
        localStorage.setItem('selectedModel', 'text');
    }
    
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
    
    // Clear conversation history on server
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
        container.innerHTML = `
            <div class="welcome-message">
                <h2>welcome to yurie</h2>
                <p>select a model and start chatting. generate text or create images.</p>
                <div class="suggestions" role="group" aria-label="Suggested prompts">
                    <button class="suggestion" onclick="sendSuggestion('Explain quantum computing in simple terms')" aria-label="Send suggestion: Explain quantum computing">
                        explain quantum computing
                    </button>
                    <button class="suggestion" onclick="sendSuggestion('Generate a cyberpunk cityscape at night')" aria-label="Send suggestion: Generate cyberpunk cityscape">
                        generate cyberpunk cityscape
                    </button>
                    <button class="suggestion" onclick="sendSuggestion('Write a haiku about artificial intelligence')" aria-label="Send suggestion: Write an AI haiku">
                        write an ai haiku
                    </button>
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
