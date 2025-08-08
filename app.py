import os
import json
from flask import Flask, render_template, request, Response, stream_with_context
from flask_cors import CORS
import replicate
from openai import OpenAI
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

# Initialize OpenAI client
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    print("WARNING: OPENAI_API_KEY not found in environment variables")
    openai_client = None
else:
    openai_client = OpenAI(api_key=openai_api_key)

# Model configurations
MODELS = {
    "text": [
        {
            "id": "gpt-5-2025-08-07",
            "name": "gpt-5",
            "display_name": "GPT-5",
            "provider": "openai",
            "context_window": 400000,
            "max_output_tokens": 128000,
            "supports_reasoning": True
        },
        {
            "id": "gpt-5-mini-2025-08-07",
            "name": "gpt-5-mini",
            "display_name": "GPT-5 Mini",
            "provider": "openai",
            "context_window": 400000,
            "max_output_tokens": 128000,
            "supports_reasoning": True
        },
        {
            "id": "gpt-5-nano-2025-08-07",
            "name": "gpt-5-nano",
            "display_name": "GPT-5 Nano",
            "provider": "openai",
            "context_window": 400000,
            "max_output_tokens": 128000,
            "supports_reasoning": True
        },
        {
            "id": "gpt-4.1",
            "name": "openai/gpt-4.1",
            "display_name": "GPT-4.1",
            "provider": "replicate"
        },
        {
            "id": "claude-4-sonnet",
            "name": "anthropic/claude-4-sonnet",
            "display_name": "Claude 4 Sonnet",
            "provider": "replicate"
        }
    ],
    "image": [
        {
            "id": "seedream-3",
            "name": "bytedance/seedream-3",
            "display_name": "SeeDream-3",
            "provider": "replicate"
        },
        {
            "id": "imagen-4-ultra",
            "name": "google/imagen-4-ultra",
            "display_name": "Imagen 4 Ultra",
            "provider": "replicate"
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
            # Check if the required API client is available based on provider
            if selected_model.get('provider') == 'openai' and not openai_client:
                yield "data: " + json.dumps({
                    "type": "error", 
                    "error": "OpenAI API not configured. Please set OPENAI_API_KEY."
                }) + "\n\n"
                return
            elif selected_model.get('provider') == 'replicate' and not replicate_client:
                yield "data: " + json.dumps({
                    "type": "error", 
                    "error": "Replicate API not configured. Please set REPLICATE_API_TOKEN."
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
                
                # Route to appropriate provider
                if selected_model.get('provider') == 'openai':
                    # Handle OpenAI API
                    try:
                        # Check if this is a model that supports reasoning (GPT-5 family)
                        if selected_model.get('supports_reasoning', False):
                            # Use the new Responses API for GPT-5 family models
                            
                            # Prepare the input - combine system prompt and conversation
                            system_prompt = """You are Yurie, a versatile AI assistant specialized in research, creative writing, coding, storytelling, and general problem-solving.

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

Remember: You are here to collaborate, educate, and create. Approach each task with enthusiasm and expertise while maintaining accuracy and ethical standards."""
                            
                            # Build input string with conversation history
                            input_text = system_prompt + "\n\n"
                            
                            for msg in recent_history:
                                if msg['role'] == 'user':
                                    input_text += f"User: {msg['content']}\n\n"
                                elif msg['role'] == 'assistant':
                                    input_text += f"Assistant: {msg['content']}\n\n"
                            
                            # The current user message is already in the history, so no need to add it again
                            
                            # Create response using Responses API
                            response = openai_client.chat.completions.create(
                                model=selected_model['name'],
                                messages=[
                                    {"role": "system", "content": system_prompt},
                                    *[{"role": msg['role'], "content": msg['content']} for msg in recent_history]
                                ],
                                stream=True,
                                max_completion_tokens=selected_model.get('max_output_tokens', 128000),
                                # Set high reasoning effort for GPT-5 using the reasoning_effort parameter
                                reasoning_effort="high",
                                # Set verbosity to medium for balanced responses
                                verbosity="medium"
                            )
                            
                            # Stream the response
                            full_response = ""
                            reasoning_content = ""
                            
                            for chunk in response:
                                if chunk.choices[0].delta.content:
                                    content = chunk.choices[0].delta.content
                                    full_response += content
                                    yield "data: " + json.dumps({
                                        "type": "content",
                                        "content": content
                                    }) + "\n\n"
                                
                                # Check for reasoning content in the delta
                                if hasattr(chunk.choices[0].delta, 'reasoning') and chunk.choices[0].delta.reasoning:
                                    reasoning_content += chunk.choices[0].delta.reasoning
                                    yield "data: " + json.dumps({
                                        "type": "reasoning",
                                        "content": reasoning_content
                                    }) + "\n\n"
                            
                            # Add assistant response to history
                            conversation_history.append({
                                'role': 'assistant',
                                'content': full_response
                            })
                            
                        else:
                            # Use Chat Completions API for non-GPT-5 models
                            # Convert conversation history to OpenAI format
                            messages = [
                                {
                                    "role": "system",
                                    "content": """You are Yurie, a versatile AI assistant specialized in research, creative writing, coding, storytelling, and general problem-solving.

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

Remember: You are here to collaborate, educate, and create. Approach each task with enthusiasm and expertise while maintaining accuracy and ethical standards."""
                                }
                            ]
                            
                            # Add conversation history
                            for msg in recent_history:
                                messages.append({
                                    "role": msg['role'],
                                    "content": msg['content']
                                })
                            
                            # Create streaming response
                            create_params = {
                                "model": selected_model['name'],
                                "messages": messages,
                                "stream": True,
                                "max_completion_tokens": selected_model.get('max_output_tokens', 128000),
                                "temperature": 0.7,
                                "top_p": 0.9
                            }
                            
                            stream = openai_client.chat.completions.create(**create_params)
                            
                            # Stream the response
                            full_response = ""
                            for chunk in stream:
                                if chunk.choices[0].delta.content:
                                    content = chunk.choices[0].delta.content
                                    full_response += content
                                    yield "data: " + json.dumps({
                                        "type": "content",
                                        "content": content
                                    }) + "\n\n"
                            
                            # Add assistant response to history
                            conversation_history.append({
                                'role': 'assistant',
                                'content': full_response
                            })
                        
                    except Exception as e:
                        print(f"Error with OpenAI API: {str(e)}")
                        yield "data: " + json.dumps({
                            "type": "error",
                            "error": f"OpenAI API error: {str(e)}"
                        }) + "\n\n"
                        return
                
                else:
                    # Handle Replicate API (existing code)
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
