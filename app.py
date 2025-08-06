import os
import json
from flask import Flask, render_template, request, Response, stream_with_context
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
            template_folder=str(Path(__file__).parent / 'templates'),
            static_folder=str(Path(__file__).parent / 'static'))
CORS(app, supports_credentials=True)

# Configure Flask session for serverless
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-yurie-chat-secret-key-2024')

# Initialize Replicate client
api_token = os.getenv('REPLICATE_API_TOKEN')
if not api_token:
    print("WARNING: REPLICATE_API_TOKEN not found in environment variables")
    replicate_client = None
else:
    replicate_client = replicate.Client(api_token=api_token)

# Model configurations
MODELS = {
    "text": [
        {
            "id": "gpt-4.1",
            "name": "openai/gpt-4.1",
            "display_name": "GPT-4.1"
        },
        {
            "id": "claude-4-sonnet",
            "name": "anthropic/claude-4-sonnet",
            "display_name": "Claude 4 Sonnet"
        }
    ],
    "image": [
        {
            "id": "seedream-3",
            "name": "bytedance/seedream-3",
            "display_name": "SeeDream-3"
        },
        {
            "id": "imagen-4-ultra",
            "name": "google/imagen-4-ultra",
            "display_name": "Imagen 4 Ultra"
        }
    ]
}

@app.route('/')
def index():
    """Render the main chat interface"""
    return render_template('index.html')

@app.route('/models', methods=['GET'])
def get_models():
    """Return available models"""
    return {
        'status': 'success',
        'models': MODELS
    }


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
    model_id = data.get('model_id', None)
    
    # Get conversation history from client (for serverless compatibility)
    conversation_history = data.get('conversation_history', [])
    
    # Get the selected model
    if model_type in MODELS:
        if model_id:
            selected_model = next((m for m in MODELS[model_type] if m['id'] == model_id), None)
        else:
            # Default to first model in the category
            selected_model = MODELS[model_type][0] if MODELS[model_type] else None
    else:
        selected_model = None
    
    if not selected_model:
        return {'error': 'Invalid model selection'}, 400
    
    if not message:
        return {'error': 'No message provided'}, 400
    
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
                
                # Build conversation prompt with markdown formatting instructions
                conversation_prompt = """You are a helpful AI assistant. Remember the context of our conversation.

## Important Formatting Instructions:

You MUST format your responses using proper Markdown for better readability:

- Use **headings** (##, ###) to organize different sections of your response
- Use **bullet points** or **numbered lists** for listing items
- Use **code blocks** with syntax highlighting for code:
  ```python
  # Example code
  ```
- Use **bold** (**text**) and *italic* (*text*) for emphasis
- Add **blank lines** between paragraphs for better spacing
- Use **tables** when presenting structured data:
  | Header 1 | Header 2 |
  |----------|----------|
  | Data 1   | Data 2   |
- Use **blockquotes** (>) for important notes or quotes
- Use **horizontal rules** (---) to separate major sections when needed

Always structure your responses with clear sections and proper formatting. Never write everything in one long paragraph.

## Conversation:

"""
                
                recent_history = conversation_history[-10:]
                for msg in recent_history:
                    if msg['role'] == 'user':
                        conversation_prompt += f"User: {msg['content']}\n"
                    elif msg['role'] == 'assistant':
                        conversation_prompt += f"Assistant: {msg['content']}\n"
                
                conversation_prompt += "Assistant: "
                
                try:
                    # Use different input parameters based on model
                    if selected_model['id'] == 'claude-4-sonnet':
                        # Claude models typically use different parameter names
                        input_params = {
                            "prompt": conversation_prompt,
                            "max_tokens": 64000,
                            "temperature": 0.7,
                            "top_p": 0.9
                        }
                    else:
                        # Default GPT-style parameters
                        input_params = {
                            "prompt": conversation_prompt,
                            "max_new_tokens": 64000,
                            "temperature": 0.7,
                            "top_p": 0.9,
                            "top_k": 50,
                            "stop_sequences": "<|end_of_text|>,<|eot_id|>"
                        }
                    
                    prediction = replicate_client.predictions.create(
                        selected_model['name'],
                        input=input_params
                    )
                except Exception as e:
                    print(f"Error creating prediction: {str(e)}")
                    yield "data: " + json.dumps({
                        "type": "error", 
                        "error": f"Model error: {str(e)}"
                    }) + "\n\n"
                    return
                
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
                
                try:
                    # Use different input parameters based on model
                    if selected_model['id'] == 'imagen-4-ultra':
                        # Imagen models might use different parameter names
                        input_params = {
                            "prompt": message,
                            "negative_prompt": "worst quality, low quality",
                            "width": 1024,
                            "height": 1024,
                            "num_inference_steps": 40,
                            "guidance_scale": 8.0
                        }
                    else:
                        # Default SeeDream parameters
                        input_params = {
                            "prompt": message,
                            "negative_prompt": "worst quality, low quality",
                            "width": 1024,
                            "height": 1024,
                            "num_inference_steps": 30,
                            "guidance_scale": 7.5
                        }
                    
                    prediction = replicate_client.predictions.create(
                        selected_model['name'],
                        input=input_params
                    )
                except Exception as e:
                    print(f"Error creating image prediction: {str(e)}")
                    yield "data: " + json.dumps({
                        "type": "error", 
                        "error": f"Model error: {str(e)}"
                    }) + "\n\n"
                    return
                
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

# PWA routes
@app.route('/manifest.json')
def manifest():
    """Serve the web app manifest"""
    return app.send_static_file('manifest.json')

@app.route('/sw.js')
def service_worker():
    """Serve the service worker with correct MIME type"""
    response = app.send_static_file('sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response
