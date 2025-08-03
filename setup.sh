#!/bin/bash

echo "🚀 AI Chatbot Setup Script"
echo "========================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "✅ uv installed successfully"
else
    echo "✅ uv is already installed"
fi

# Create virtual environment
echo "🔧 Creating virtual environment..."
uv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
uv pip install -r requirements.txt

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || echo "REPLICATE_API_TOKEN=your_replicate_api_token_here" > .env
    echo "📝 Please edit .env and add your Replicate API token"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "1. Edit .env and add your Replicate API token"
echo "2. Run: python app.py"
echo "3. Open http://localhost:5001 in your browser"
echo ""
echo "Happy chatting! 🤖"