from flask import jsonify

def app(request):
    """Health check endpoint for Vercel"""
    return jsonify({"status": "ok", "message": "API is running"})