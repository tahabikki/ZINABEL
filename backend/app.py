from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_session import Session
from config import config
import os
from datetime import timedelta
from functools import wraps

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Configure session
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    # Do not embed secret values in source. Read from environment or leave empty for dev.
    app.secret_key = os.getenv('SECRET_KEY', '')
    
    # Initialize session
    Session(app)
    
    # Enable CORS with explicit configuration
    CORS(
        app,
        resources={r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', '*'),
            "methods": app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
            "allow_headers": app.config.get('CORS_ALLOW_HEADERS', ['Content-Type', 'Authorization']),
            "expose_headers": app.config.get('CORS_EXPOSE_HEADERS', ['Content-Type']),
            "supports_credentials": app.config.get('CORS_SUPPORTS_CREDENTIALS', True),
            "max_age": 3600
        }}
    )
    
    # ⚡ Add response caching headers for ultra-fast delivery
    @app.after_request
    def add_cache_headers(response):
        # Cache GET requests for 2 seconds (very short for real-time updates)
        if request.method == 'GET':
            response.cache_control.max_age = 2
            response.cache_control.public = True
            response.headers['X-Cache-Control'] = 'max-age=2'
        return response
    
    # Register blueprints
    from api.routes import orders_bp, products_bp, warehouse_bp, stock_bp, reports_bp, pdfs_bp, sync_bp, auth_bp
    
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(warehouse_bp, url_prefix='/api/warehouse')
    app.register_blueprint(stock_bp, url_prefix='/api/stock')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(pdfs_bp, url_prefix='/api/pdfs')
    app.register_blueprint(sync_bp, url_prefix='/api/sync')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'message': 'ZINABEL API is running'})
    
    # Root welcome page
    @app.route('/', methods=['GET'])
    def welcome():
        return jsonify({
            'message': '✅ ZINABEL WAREHOUSE MANAGEMENT SYSTEM',
            'status': 'Backend is running!',
            'endpoints': {
                'health': '/api/health',
                'auth': '/api/auth',
                'sync': '/api/sync',
                'orders': '/api/orders',
                'products': '/api/products',
                'warehouse': '/api/warehouse',
                'stock': '/api/stock',
                'reports': '/api/reports'
            }
        })
    
    # Status endpoint for scheduler and sync
    @app.route('/api/status', methods=['GET'])
    def status():
        from sync_scheduler import get_scheduler_status
        scheduler_status = get_scheduler_status()
        return jsonify({
            'system': 'online',
            'scheduler': scheduler_status
        }), 200
    
    # Start background sync scheduler
    @app.before_request
    def startup():
        """Initialize scheduler on first request"""
        if not app.config.get('_SCHEDULER_STARTED'):
            try:
                from sync_scheduler import start_scheduler
                start_scheduler()
                app.config['_SCHEDULER_STARTED'] = True
            except Exception as e:
                print(f"⚠️ Warning: Could not start scheduler: {str(e)}")
                app.config['_SCHEDULER_STARTED'] = False
    
    # Graceful shutdown
    @app.teardown_appcontext
    def shutdown(exception=None):
        """Clean up on shutdown"""
        try:
            from sync_scheduler import stop_scheduler
            stop_scheduler()
        except:
            pass
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='localhost', port=5000)
