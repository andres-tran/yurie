# Yurie - AI Chatbot App

A minimal AI chatbot application built with Flask and Replicate API, featuring text generation and image creation capabilities.

## Features

- **Text Generation**: Powered by openai/gpt-4.1 model
- **Image Generation**: Powered by bytedance/seedream-3 model
- **Minimal UI**: Clean, dark-themed interface optimized for desktop and mobile
- **Real-time Streaming**: Stream responses as they're generated
- **Theme Toggle**: Switch between dark and light themes
- **Mobile Optimized**: Responsive design with touch-friendly interface

## Prerequisites

- Python 3.8 or higher
- Replicate API token (get one at https://replicate.com/account/api-tokens)

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd yurie
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Replicate API token to `.env`:
   ```
   REPLICATE_API_TOKEN=your_actual_token_here
   ```

## Running Locally

```bash
python run_local.py
```

The app will be available at `http://localhost:8080`

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `REPLICATE_API_TOKEN`: Your Replicate API token
   - `FLASK_SECRET_KEY`: A secure random string

## Project Structure

```
yurie/
├── api/
│   ├── __init__.py
│   └── index.py        # Main Flask application
├── static/
│   ├── css/
│   │   └── style.css   # Minimal styling
│   ├── js/
│   │   └── app.js      # Frontend JavaScript
│   └── icons/
│       └── icon-180.png
├── templates/
│   └── index.html      # Main HTML template
├── requirements.txt    # Python dependencies
├── run_local.py       # Local development server
├── vercel.json        # Vercel configuration
└── .env.example       # Environment variables template
```

## API Endpoints

- `GET /` - Main chat interface
- `POST /chat` - Send message and receive AI response (SSE)
- `POST /start-session` - Initialize a new chat session
- `POST /clear-history` - Clear conversation history
- `GET /health` - Health check endpoint

## Models Used

- **Text Generation**: openai/gpt-4.1
- **Image Generation**: bytedance/seedream-3

## Troubleshooting

1. **"API not configured" error**: Make sure your Replicate API token is correctly set in the `.env` file
2. **Module not found errors**: Ensure all dependencies are installed with `pip install -r requirements.txt`
3. **Port already in use**: Change the PORT in `.env` file or kill the process using port 8080

## License

MIT
