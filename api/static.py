"""
Static file handler for Vercel
This helps serve static files properly in the Vercel environment
"""
import os
from flask import send_from_directory

def static_handler(path):
    """Serve static files from the static directory"""
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    return send_from_directory(static_dir, path)