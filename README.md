# Yurie - AI Chat Assistant

A modern AI chatbot application built with Flask and Replicate's API, featuring both text generation and image generation capabilities with a sleek dark theme interface.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/flask-3.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🤖 **Dual AI Models**: 
  - GPT-4.1 for text/chat queries
  - SeeDream-3 for image generation
- 🧠 **Conversation Memory**: AI remembers context throughout the conversation
- 🌊 **Streaming Responses**: Real-time streaming of AI responses
- 🌙 **Dark Mode**: Elegant dark theme for comfortable viewing
- 📱 **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- ⚡ **Fast Setup**: Uses `uv` for quick Python dependency management
- 🔒 **Session Management**: Each user gets their own conversation session

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- Replicate API token

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/andres-tran/yurie.git
   cd yurie
   ```

2. **Install uv** (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

3. **Run the setup script**:
   
   For macOS/Linux:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   For Windows:
   ```bash
   setup.bat
   ```

4. **Configure environment variables**:
   Create a `.env` file in the root directory and add:
   ```
   REPLICATE_API_TOKEN=your_replicate_api_token_here
   SECRET_KEY=your-secret-key-here-change-in-production
   ```

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Open your browser** and navigate to:
   ```
   http://localhost:5001
   ```

## 🎮 Usage

1. **Select a Model**: Choose between GPT-4.1 for text generation or SeeDream-3 for image generation
2. **Type Your Message**: Enter your prompt in the input field
3. **Send**: Press Enter or click the send button
4. **View Response**: Watch as the AI streams its response in real-time

### Example Prompts

**For Text (GPT-4.1)**:
- "Explain quantum computing in simple terms"
- "Write a haiku about artificial intelligence"
- "What are the benefits of renewable energy?"

**For Images (SeeDream-3)**:
- "Generate a cyberpunk cityscape at night"
- "Create a fantasy dragon in a mystical forest"
- "Design a futuristic spaceship interior"

## 🛠️ Technical Stack

- **Backend**: Flask (Python)
- **AI API**: Replicate
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: Custom CSS with dark theme
- **Session Management**: Flask sessions
- **Streaming**: Server-Sent Events (SSE)

## 📁 Project Structure

```
yurie/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── .env               # Environment variables (create this)
├── .gitignore         # Git ignore file
├── README.md          # This file
├── setup.sh           # Setup script for macOS/Linux
├── setup.bat          # Setup script for Windows
├── templates/         # HTML templates
│   └── index.html     # Main chat interface
└── static/           # Static assets
    ├── css/
    │   └── style.css  # Dark theme styles
    └── js/
        └── app.js     # Client-side JavaScript
```

## ⚙️ Configuration

### Environment Variables

- `REPLICATE_API_TOKEN`: Your Replicate API token (required)
- `SECRET_KEY`: Flask secret key for session management (required for production)

### Port Configuration

By default, the app runs on port 5001. To change this, modify the last line in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

## 🚀 Deployment

### Deploying to Vercel

1. Fork or clone this repository
2. Connect your GitHub repository to Vercel
3. Deploy with one click - Vercel will automatically detect the configuration

The app includes all necessary Vercel configuration files:
- `vercel.json` - Routing and build configuration
- `api/index.py` - Serverless function entry point
- Static files are automatically served

### Environment Variables on Vercel

In your Vercel project settings, add these environment variables:
- `REPLICATE_API_TOKEN` - Your Replicate API token
- `SECRET_KEY` - A secure secret key for production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- AI models powered by [Replicate](https://replicate.com/)
- Inspired by modern chat interfaces

## 📞 Contact

Andre Tran - [@andres-tran](https://github.com/andres-tran)

Project Link: [https://github.com/andres-tran/yurie](https://github.com/andres-tran/yurie)

---

<p align="center">Made with ❤️ by Andre Tran</p>