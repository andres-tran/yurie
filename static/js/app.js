// Global state
let currentModel = 'text';
let isGenerating = false;
let markdownIt = null;

// DOM element references
const dom = {
    modelSelector: null,
    messageInput: null,
    sendButton: null,
    chatForm: null,
    themeToggle: null,
    newChat: null,
    messagesContainer: null,
    suggestions: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements
    dom.modelSelector = document.getElementById('modelSelector');
    dom.messageInput = document.getElementById('messageInput');
    dom.sendButton = document.getElementById('sendButton');
    dom.chatForm = document.getElementById('chatForm');
    dom.themeToggle = document.getElementById('themeToggle');
    dom.newChat = document.getElementById('newChat');
    dom.messagesContainer = document.getElementById('messagesContainer');
    dom.suggestions = document.querySelectorAll('.suggestion');

    // Setup application components
    setupTheme();
    setupMarkdownRenderer();
    setupModelSelector();
    setupInputHandlers();
    setupEventListeners();
    setupMobileOptimizations();
    setupNativeInteractions();
});

// Setup event listeners
function setupEventListeners() {
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.newChat.addEventListener('click', newChat);
    dom.chatForm.addEventListener('submit', sendMessage);
    dom.suggestions.forEach(btn => {
        btn.addEventListener('click', () => sendSuggestion(btn.textContent.trim()));
    });
}

// Setup native macOS/iOS interactions
function setupNativeInteractions() {
    setupContextMenus();
    setupButtonAnimations();
    
    document.addEventListener('selectstart', (e) => {
        const isTextInput = e.target.matches('input, textarea, .message-content, .message-content *');
        if (!isTextInput) {
            e.preventDefault();
        }
    });
}

// Setup context menus
function setupContextMenus() {
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
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) existingMenu.remove();
    
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
    
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        }, { once: true });
    }, 0);
}

// Copy message content
function copyMessageContent(messageContent) {
    navigator.clipboard.writeText(messageContent.textContent);
}

// Select all content in a message
function selectAllContent(messageContent) {
    const range = document.createRange();
    range.selectNodeContents(messageContent);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Setup button animations
function setupButtonAnimations() {
    const buttons = document.querySelectorAll('button, .suggestion');
    buttons.forEach(button => {
        button.addEventListener('mousedown', () => button.style.transform = 'scale(0.96)');
        button.addEventListener('mouseup', () => button.style.transform = 'scale(1)');
        button.addEventListener('mouseleave', () => button.style.transform = 'scale(1)');
    });
}

// Setup theme management
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateSyntaxHighlightingTheme(savedTheme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateSyntaxHighlightingTheme(newTheme);
}

// Update syntax highlighting theme
function updateSyntaxHighlightingTheme(theme) {
    // This can be expanded if different syntax themes are desired
}

// Setup markdown renderer
function setupMarkdownRenderer() {
    markdownIt = window.markdownit({
        html: true, linkify: true, typographer: true, breaks: true,
        highlight: (str, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
                } catch (__) {}
            }
            return `<pre class="hljs"><code>${markdownIt.utils.escapeHtml(str)}</code></pre>`;
        }
    });
    hljs.registerAliases(['js', 'ts', 'py', 'sh'], { languageName: 'javascript' });
}

// Model selector setup
function setupModelSelector() {
    const savedModel = localStorage.getItem('selectedModel') || 'text';
    currentModel = savedModel;
    dom.modelSelector.value = savedModel;
    
    dom.modelSelector.addEventListener('change', (e) => {
        if (isGenerating) return;
        currentModel = e.target.value;
        localStorage.setItem('selectedModel', currentModel);
    });
}

// Input handlers
function setupInputHandlers() {
    dom.messageInput.addEventListener('input', () => {
        dom.sendButton.disabled = dom.messageInput.value.trim() === '' || isGenerating;
        autoResizeTextarea(dom.messageInput);
    });
    
    dom.messageInput.addEventListener('keydown', handleKeyPress);
    
    if (dom.messageInput.value.trim() !== '') {
        dom.sendButton.disabled = false;
    }
    
    autoResizeTextarea(dom.messageInput);
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    const scrollPos = dom.messagesContainer.scrollTop;
    textarea.style.height = 'auto';
    const isMobile = window.innerWidth <= 768;
    const minHeight = isMobile ? 44 : 80;
    const maxHeight = isMobile ? 100 : 180;
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight))}px`;
    dom.messagesContainer.scrollTop = scrollPos;
}

// Handle key press for sending message
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(event);
    }
}

// Send message
async function sendMessage(event) {
    if (event) event.preventDefault();

    const message = dom.messageInput.value.trim();
    if (!message || isGenerating) return;

    isGenerating = true;
    dom.sendButton.disabled = true;
    dom.sendButton.classList.add('sending');
    triggerHapticFeedback('light');
    animateButtonPress(dom.sendButton);

    dom.messageInput.value = '';
    autoResizeTextarea(dom.messageInput);

    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => welcomeMessage.remove(), 300);
    }

    addMessage(message, 'user');
    const assistantMessageId = `msg-${Date.now()}`;
    addMessage('', 'assistant', assistantMessageId);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ message, model_type: currentModel })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleStreamedData(data, assistantMessageId, assistantMessage);
                        if (data.type === 'content') assistantMessage += data.content;
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
        dom.sendButton.disabled = dom.messageInput.value.trim() === '';
        dom.sendButton.classList.remove('sending');
    }
}

// Handle streamed data from the server
function handleStreamedData(data, id, currentContent) {
    switch (data.type) {
        case 'start':
            updateMessage(id, createTypingIndicator());
            break;
        case 'content':
            updateMessage(id, currentContent + data.content, true);
            break;
        case 'image':
            updateMessage(id, `<img src="${data.content}" alt="Generated image" />`);
            break;
        case 'error':
            updateMessage(id, `Error: ${data.error}`);
            break;
        case 'progress':
            updateMessage(id, `${createTypingIndicator()}<p>${data.message}</p>`);
            break;
    }
}

// Add a message to the chat interface
function addMessage(content, sender, id) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (id) messageDiv.id = id;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (sender === 'user') {
        contentDiv.textContent = content;
    } else {
        contentDiv.innerHTML = !content ? createTypingIndicator() : content;
    }

    messageDiv.appendChild(contentDiv);
    dom.messagesContainer.appendChild(messageDiv);
    smoothScrollToBottom(dom.messagesContainer);
}

// Smoothly scroll to the bottom of the container
function smoothScrollToBottom(container) {
    const scrollHeight = container.scrollHeight;
    const height = container.clientHeight;
    const maxScrollTop = scrollHeight - height;
    
    container.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
    });
}

// Update an existing message's content
function updateMessage(id, content, isMarkdown = false) {
    const message = document.getElementById(id);
    if (message) {
        const contentDiv = message.querySelector('.message-content');
        if (isMarkdown && markdownIt) {
            contentDiv.innerHTML = markdownIt.render(content);
            addCopyButtons(contentDiv);
        } else {
            contentDiv.innerHTML = content;
        }
        smoothScrollToBottom(dom.messagesContainer);
    }
}

// Add copy buttons to code blocks
function addCopyButtons(container) {
    container.querySelectorAll('pre code').forEach(block => {
        const pre = block.parentElement;
        if (pre.querySelector('.copy-btn')) return;

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

// Copy text to clipboard
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

// Create typing indicator HTML
function createTypingIndicator() {
    return `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
}

// Send a suggestion
function sendSuggestion(text) {
    dom.messageInput.value = text;
    autoResizeTextarea(dom.messageInput);
    
    if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('cityscape')) {
        currentModel = 'image';
    } else {
        currentModel = 'text';
    }
    dom.modelSelector.value = currentModel;
    localStorage.setItem('selectedModel', currentModel);
    
    sendMessage();
}

// Start a new chat
async function newChat() {
    if (isGenerating) return;
    
    triggerHapticFeedback('medium');
    animateButtonPress(dom.newChat);
    
    dom.messagesContainer.style.opacity = '0';
    
    try {
        await fetch('/clear-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
    } catch (error) {
        console.error('Error clearing history:', error);
    }
    
    setTimeout(() => {
        dom.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h2>welcome to yurie</h2>
                <p>select a model and start chatting. generate text or create images.</p>
                <div class="suggestions" role="group" aria-label="Suggested prompts">
                    <button class="suggestion">explain quantum computing</button>
                    <button class="suggestion">generate cyberpunk cityscape</button>
                    <button class="suggestion">write an ai haiku</button>
                </div>
            </div>`;
        dom.messagesContainer.style.opacity = '1';
        // Re-attach suggestion listeners
        dom.suggestions = document.querySelectorAll('.suggestion');
        dom.suggestions.forEach(btn => {
            btn.addEventListener('click', () => sendSuggestion(btn.textContent.trim()));
        });
    }, 200);
}

// Mobile-specific optimizations
function setupMobileOptimizations() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    let viewportHeight = window.innerHeight;
    window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        if (currentHeight < viewportHeight * 0.75) {
            document.body.classList.add('keyboard-open');
            setTimeout(() => dom.messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        } else {
            document.body.classList.remove('keyboard-open');
        }
        viewportHeight = currentHeight;
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) event.preventDefault();
        lastTouchEnd = now;
    }, false);

    dom.messageInput.addEventListener('touchstart', (e) => e.target.focus());

    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 100 && touchStartX < 50) newChat();
    });

    dom.messagesContainer.style.webkitOverflowScrolling = 'touch';
}

// Haptic feedback for mobile
function triggerHapticFeedback(style = 'light') {
    if ('vibrate' in navigator) {
        const duration = { light: 10, medium: 20, heavy: 30 };
        navigator.vibrate(duration[style] || 10);
    }
}

// Animate button press
function animateButtonPress(button) {
    button.style.transform = 'scale(0.96)';
    setTimeout(() => button.style.transform = 'scale(1)', 150);
}
