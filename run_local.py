from app import app
import os

if __name__ == "__main__":
    # Use a different port to avoid conflict with vercel dev if it's running
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=True, port=port)
