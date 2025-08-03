let currentModel = 'text';
let isGenerating = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupModelSelector();
    setupInputHandlers();
});

// Model selector setup
function setupModelSelector() {
    const modelSelector = document.getElementById('modelSelector');
    modelSelector.addEventListener('change', (e) => {
        if (isGenerating) return;
        currentModel = e.target.value;
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
    
    // Enable send button on load if there's text
    sendButton.disabled = input.value.trim() === '';
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    // Save current scroll position
    const scrollPos = document.getElementById('messagesContainer').scrollTop;
    
    // Reset height to calculate new scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height with max limit
    const newHeight = Math.min(textarea.scrollHeight, 120);
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
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isGenerating) return;
    
    isGenerating = true;
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    
    // Clear input
    input.value = '';
    autoResizeTextarea(input);
    
    // Remove welcome message
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Add user message
    addMessage(message, 'user');
    
    // Add assistant placeholder
    const assistantMessageId = 'msg-' + Date.now();
    addMessage('', 'assistant', assistantMessageId);
    
    try {
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
                            updateMessage(assistantMessageId, assistantMessage);
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
    contentDiv.innerHTML = sender === 'assistant' && !content ? createTypingIndicator() : content;
    
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Update message content
function updateMessage(id, content) {
    const message = document.getElementById(id);
    if (message) {
        const contentDiv = message.querySelector('.message-content');
        contentDiv.innerHTML = content;
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
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
    input.value = text;
    autoResizeTextarea(input);
    
    // Update model based on suggestion
    if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('image')) {
        currentModel = 'image';
        document.getElementById('modelSelector').value = 'image';
    } else {
        currentModel = 'text';
        document.getElementById('modelSelector').value = 'text';
    }
    
    sendMessage();
}

// New chat
async function newChat() {
    if (isGenerating) return;
    
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
    
    const container = document.getElementById('messagesContainer');
    container.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Yurie</h2>
            <p>Select a model and start chatting. You can generate text responses or create images based on your prompts.</p>
            <div class="suggestions">
                <button class="suggestion" onclick="sendSuggestion('Explain quantum computing in simple terms')">
                    💡 Explain quantum computing
                </button>
                <button class="suggestion" onclick="sendSuggestion('Generate a cyberpunk cityscape at night')">
                    🎨 Generate cyberpunk cityscape
                </button>
                <button class="suggestion" onclick="sendSuggestion('Write a haiku about artificial intelligence')">
                    ✍️ Write an AI haiku
                </button>
            </div>
        </div>
    `;
}