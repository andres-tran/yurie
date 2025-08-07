import os
import json
from flask import Flask, render_template, request, Response, stream_with_context, session
from flask_cors import CORS
import replicate
from dotenv import load_dotenv
import time
import uuid
from pathlib import Path

# Load environment variables
load_dotenv()

# Configure Flask with explicit paths for Vercel
app = Flask(__name__,
            template_folder=str(Path(__file__).parent.parent / 'templates'),
            static_folder=str(Path(__file__).parent.parent / 'static'))
CORS(app, supports_credentials=True)

# Configure Flask session for serverless
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-yurie-chat-secret-key-2024')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('VERCEL_ENV') is not None  # Only use secure cookies on Vercel

# Initialize Replicate client
api_token = os.getenv('REPLICATE_API_TOKEN')
if not api_token:
    print("WARNING: REPLICATE_API_TOKEN not found in environment variables")
    replicate_client = None
else:
    replicate_client = replicate.Client(api_token=api_token)

# Model configurations
MODELS = {
    "text": {
        "name": "openai/gpt-4.1",
        "version": "gpt-4.1",
        "display_name": "GPT-4.1 (Text)"
    },
    "image": {
        "name": "bytedance/seedream-3", 
        "version": "seedream-3",
        "display_name": "SeeDream-3 (Image)"
    }
}

@app.route('/')
def index():
    """Render the main chat interface"""
    return render_template('index.html')

@app.route('/start-session', methods=['POST'])
def start_session():
    """Initialize a new session - Note: Returns ID for client-side tracking"""
    session_id = str(uuid.uuid4())
    return {
        'status': 'success',
        'session_id': session_id,
        'message': 'Session initialized'
    }

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    model_type = data.get('model_type', 'text')
    
    if not message:
        return {'error': 'No message provided'}, 400
    
    # For Vercel serverless, we'll use a simplified approach
    conversation_history = []
    
    # Add user message to history
    conversation_history.append({
        'role': 'user',
        'content': message
    })
    
    def generate():
        try:
            if not replicate_client:
                yield "data: " + json.dumps({
                    "type": "error", 
                    "error": "API not configured. Please set REPLICATE_API_TOKEN."
                }) + "\n\n"
                return
            
            if model_type == 'text':
                yield "data: " + json.dumps({"type": "start", "message": "Generating response..."}) + "\n\n"
                
                # Build conversation prompt with the Yurie system prompt
                conversation_prompt = """You are Yurie, a versatile AI assistant specialized in research, creative writing, coding, storytelling, and general problem-solving.

## Core Identity & Purpose
- You are a knowledgeable, creative, and analytical AI collaborator
- You excel at breaking down complex tasks and providing comprehensive solutions
- You maintain high standards for accuracy, clarity, and usefulness

## Communication Style
- Default: Professional, clear, and engaging
- Adapt your tone based on the task (formal for research, creative for storytelling, technical for coding)
- Use structured formatting with headings, bullet points, and code blocks for clarity
- Be concise yet thorough, avoiding unnecessary verbosity

## Core Capabilities

### 🔍 Research & Analysis
- Break down complex questions into manageable components
- Synthesize information from multiple perspectives
- Evaluate credibility and identify biases
- Present findings with confidence levels (certain/probable/speculative)
- When sources conflict, clearly present different viewpoints

### ✍️ Creative Writing & Storytelling
- Craft engaging narratives with compelling characters and plots
- Adapt to various literary styles and genres
- Develop rich, immersive world-building
- Guide story structure using established frameworks (three-act, hero's journey, etc.)
- Maintain consistent tone and voice throughout narratives

### 💻 Coding & Technical Support
- Write clean, efficient, well-commented code
- Follow language-specific best practices and style guides
- Debug systematically: analyze error → explain cause → provide fix
- Review code for: readability, performance, security, error handling
- Ask for clarification on requirements when needed

### 🤝 General Assistance
- Provide helpful, accurate information on diverse topics
- Solve problems step-by-step with clear reasoning
- Offer practical advice and actionable solutions
- Ask clarifying questions when requests are ambiguous

## Response Guidelines
1. **Structure**: Use markdown formatting for all responses
2. **Accuracy**: Never fabricate information; acknowledge limitations
3. **Reasoning**: For complex tasks, show your thought process
4. **Quality**: Self-review responses for completeness and accuracy
5. **Ethics**: Decline harmful requests; maintain objectivity on sensitive topics

## Task Recognition
When users invoke specific modes, adjust your approach:
- "Research mode" → Systematic analysis with sources
- "Story mode" → Creative narrative focus
- "Code mode" → Technical precision and best practices
- Default → Balanced, helpful assistance

Remember: You are here to collaborate, educate, and create. Approach each task with enthusiasm and expertise while maintaining accuracy and ethical standards.

## Conversation:

"""
                
                recent_history = conversation_history[-10:]
                for msg in recent_history:
                    if msg['role'] == 'user':
                        conversation_prompt += f"User: {msg['content']}\n"
                    elif msg['role'] == 'assistant':
                        conversation_prompt += f"Assistant: {msg['content']}\n"
                
                conversation_prompt += "Assistant: "
                
                prediction = replicate_client.predictions.create(
                    "openai/gpt-4.1",
                    input={
                        "prompt": conversation_prompt,
                        "max_new_tokens": 512,
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 50,
                        "stop_sequences": "<|end_of_text|>,<|eot_id|>"
                    }
                )
                
                while prediction.status not in ["succeeded", "failed", "canceled"]:
                    prediction.reload()
                    time.sleep(0.1)
                
                if prediction.status == "succeeded":
                    output = prediction.output
                    if isinstance(output, list):
                        output = ''.join(output)
                    
                    if "Assistant:" in output:
                        output = output.split("Assistant:")[-1].strip()
                    
                    conversation_history.append({
                        'role': 'assistant',
                        'content': output
                    })
                    
                    # Stream the response in chunks while preserving formatting
                    chunk_size = 50  # Characters per chunk
                    for i in range(0, len(output), chunk_size):
                        chunk = output[i:i + chunk_size]
                        yield "data: " + json.dumps({
                            "type": "content", 
                            "content": chunk
                        }) + "\n\n"
                        time.sleep(0.02)
                else:
                    yield "data: " + json.dumps({
                        "type": "error", 
                        "error": "Failed to generate response"
                    }) + "\n\n"
                    
            elif model_type == 'image':
                yield "data: " + json.dumps({"type": "start", "message": "Generating image..."}) + "\n\n"
                
                prediction = replicate_client.predictions.create(
                    "bytedance/seedream-3",
                    input={
                        "prompt": message,
                        "negative_prompt": "worst quality, low quality",
                        "width": 1024,
                        "height": 1024,
                        "num_inference_steps": 30,
                        "guidance_scale": 7.5
                    }
                )
                
                while prediction.status not in ["succeeded", "failed", "canceled"]:
                    prediction.reload()
                    
                    if hasattr(prediction, 'logs') and prediction.logs:
                        yield "data: " + json.dumps({
                            "type": "progress", 
                            "message": "Processing..."
                        }) + "\n\n"
                    
                    time.sleep(0.5)
                
                if prediction.status == "succeeded" and prediction.output:
                    image_url = prediction.output[0] if isinstance(prediction.output, list) else prediction.output
                    
                    conversation_history.append({
                        'role': 'assistant',
                        'content': f"[Generated image based on prompt: {message}]"
                    })
                    
                    yield "data: " + json.dumps({
                        "type": "image", 
                        "content": image_url
                    }) + "\n\n"
                else:
                    yield "data: " + json.dumps({
                        "type": "error", 
                        "error": "Failed to generate image"
                    }) + "\n\n"
                    
            yield "data: " + json.dumps({"type": "done"}) + "\n\n"
            
        except Exception as e:
            yield "data: " + json.dumps({
                "type": "error", 
                "error": str(e)
            }) + "\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@app.route('/clear-history', methods=['POST'])
def clear_history():
    """Clear conversation history - Note: In serverless, this is a no-op"""
    return {'status': 'success', 'message': 'History cleared'}

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'healthy', 'timestamp': time.time()}
