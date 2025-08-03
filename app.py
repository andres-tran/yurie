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

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configure Flask session
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Initialize Replicate client
replicate_client = replicate.Client(api_token=os.getenv('REPLICATE_API_TOKEN'))

# Model configurations
# Note: Using the exact models specified by user
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
    # Initialize session with unique ID if not exists
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        session['conversation_history'] = []
        session.permanent = True  # Make session permanent
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    model_type = data.get('model_type', 'text')
    
    if not message:
        return {'error': 'No message provided'}, 400
    
    # Get or initialize conversation history
    if 'conversation_history' not in session:
        session['conversation_history'] = []
        session.permanent = True
    
    # Create a copy of the history to work with
    conversation_history = session['conversation_history'].copy()
    
    # Add user message to history
    conversation_history.append({
        'role': 'user',
        'content': message
    })
    
    # Update session with new history
    session['conversation_history'] = conversation_history
    session.modified = True
    
    def generate():
        try:
            if model_type == 'text':
                # Text generation with GPT-4.1 (using openai/gpt-4.1 as specified)
                yield "data: " + json.dumps({"type": "start", "message": "Generating response..."}) + "\n\n"
                
                # Build conversation prompt with history
                conversation_prompt = "You are a helpful AI assistant. Remember the context of our conversation.\n\n"
                
                # Add conversation history (limit to last 10 messages to avoid token limits)
                recent_history = conversation_history[-10:]
                for msg in recent_history:
                    if msg['role'] == 'user':
                        conversation_prompt += f"User: {msg['content']}\n"
                    elif msg['role'] == 'assistant':
                        conversation_prompt += f"Assistant: {msg['content']}\n"
                
                conversation_prompt += "Assistant: "
                
                # Note: Using fallback model for demo - actual deployment would use "openai/gpt-4.1"
                prediction = replicate_client.predictions.create(
                    "openai/gpt-4.1",  # Fallback model for demonstration
                    input={
                        "prompt": conversation_prompt,
                        "max_new_tokens": 512,
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 50,
                        "stop_sequences": "<|end_of_text|>,<|eot_id|>"
                    }
                )
                
                # Wait for prediction to start
                while prediction.status not in ["succeeded", "failed", "canceled"]:
                    prediction.reload()
                    time.sleep(0.1)
                
                if prediction.status == "succeeded":
                    output = prediction.output
                    if isinstance(output, list):
                        output = ''.join(output)
                    
                    # Clean up the response (remove any repeated prompts)
                    if "Assistant:" in output:
                        output = output.split("Assistant:")[-1].strip()
                    
                    # Add assistant response to history
                    conversation_history.append({
                        'role': 'assistant',
                        'content': output
                    })
                    
                    # Update session with complete history
                    session['conversation_history'] = conversation_history
                    session.modified = True
                    
                    # Stream the response
                    words = output.split()
                    for i, word in enumerate(words):
                        yield "data: " + json.dumps({
                            "type": "content", 
                            "content": word + (" " if i < len(words) - 1 else "")
                        }) + "\n\n"
                        time.sleep(0.02)  # Simulate streaming
                else:
                    yield "data: " + json.dumps({
                        "type": "error", 
                        "error": "Failed to generate response"
                    }) + "\n\n"
                    
            elif model_type == 'image':
                # Image generation with SeeDream-3 (using bytedance/seedream-3 as specified)
                yield "data: " + json.dumps({"type": "start", "message": "Generating image..."}) + "\n\n"
                
                # Note: Using fallback model for demo - actual deployment would use "bytedance/seedream-3"
                prediction = replicate_client.predictions.create(
                    "bytedance/seedream-3",  # Fallback model
                    input={
                        "prompt": message,
                        "negative_prompt": "worst quality, low quality",
                        "width": 1024,
                        "height": 1024,
                        "num_inference_steps": 30,
                        "guidance_scale": 7.5
                    }
                )
                
                # Wait for prediction to complete
                while prediction.status not in ["succeeded", "failed", "canceled"]:
                    prediction.reload()
                    
                    # Send progress updates
                    if hasattr(prediction, 'logs') and prediction.logs:
                        yield "data: " + json.dumps({
                            "type": "progress", 
                            "message": "Processing..."
                        }) + "\n\n"
                    
                    time.sleep(0.5)
                
                if prediction.status == "succeeded" and prediction.output:
                    # Get the image URL
                    image_url = prediction.output[0] if isinstance(prediction.output, list) else prediction.output
                    
                    # Add image generation to history
                    conversation_history.append({
                        'role': 'assistant',
                        'content': f"[Generated image based on prompt: {message}]"
                    })
                    
                    # Update session with complete history
                    session['conversation_history'] = conversation_history
                    session.modified = True
                    
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

@app.route('/models')
def get_models():
    return {'models': MODELS}

@app.route('/clear-history', methods=['POST'])
def clear_history():
    """Clear the conversation history for the current session"""
    session['conversation_history'] = []
    session['session_id'] = str(uuid.uuid4())  # Generate new session ID
    session.permanent = True
    session.modified = True
    return {'status': 'success', 'message': 'Conversation history cleared'}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)