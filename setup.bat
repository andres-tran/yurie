@echo off
echo 🚀 AI Chatbot Setup Script for Windows
echo =====================================

REM Check if uv is installed
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing uv...
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    echo ✅ uv installed successfully
) else (
    echo ✅ uv is already installed
)

REM Create virtual environment
echo 🔧 Creating virtual environment...
uv venv

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call .venv\Scripts\activate

REM Install dependencies
echo 📦 Installing dependencies...
uv pip install -r requirements.txt

REM Check for .env file
if not exist .env (
    echo ⚠️  .env file not found. Creating...
    echo REPLICATE_API_TOKEN=your_replicate_api_token_here > .env
    echo 📝 Please edit .env and add your Replicate API token
)

echo.
echo ✅ Setup complete!
echo.
echo To run the application:
echo 1. Edit .env and add your Replicate API token
echo 2. Run: python app.py
echo 3. Open http://localhost:5001 in your browser
echo.
echo Happy chatting! 🤖
pause