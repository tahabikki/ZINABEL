"""
WSGI entrypoint for Gunicorn / production.
Create the Flask app instance when this module is imported so Gunicorn can serve it.
"""
from app import create_app

# Create the Flask application for WSGI servers (gunicorn)
app = create_app()
