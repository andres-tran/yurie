import os
import json
from flask import Flask, render_template, request, Response, stream_with_context, session
from flask_cors import CORS
import replicate
from dotenv import load_dotenv
import time
import uuid

# Load environment variables
load_dotenv()

# Configure Flask with explicit paths
app = Flask(__name__, 
           template_folder='../templates',
           static_folder='../static',
           static_url_path='/static')
CORS(app, supports_credentials=True)

# Configure Flask session for serverless
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('ENVIRONMENT') == 'production'

# Initialize Replicate client
replicate_client = replicate.Client(api_token=os.getenv('REPLICATE_API_TOKEN'))

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
            if model_type == 'text':
                yield "data: " + json.dumps({"type": "start", "message": "Generating response..."}) + "\n\n"
                
                # Build conversation prompt
                conversation_prompt = "You are a helpful AI assistant. Remember the context of our conversation.\n\n"
                
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
                    
                    words = output.split()
                    for i, word in enumerate(words):
                        yield "data: " + json.dumps({
                            "type": "content", 
                            "content": word + (" " if i < len(words) - 1 else "")
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

# Serve static files explicitly for Vercel
@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return app.send_static_file(f'css/{filename}')

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return app.send_static_file(f'js/{filename}')

@app.route('/icons/<path:filename>')
def serve_icons(filename):
    """Serve icon files"""
    return app.send_static_file(f'icons/{filename}')

# This is the important part for Vercel
# Export the Flask app instance
app = app