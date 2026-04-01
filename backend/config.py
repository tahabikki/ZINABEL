import os

class Config:
    """Base configuration"""
    FLASK_ENV = 'development'
    DEBUG = True
    JSON_SORT_KEYS = False
    
    # CORS Configuration - Read from environment variables
    _cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000')
    CORS_ORIGINS = [origin.strip() for origin in _cors_origins.split(',')]
    CORS_ALLOW_HEADERS = os.getenv('CORS_ALLOW_HEADERS', 'Content-Type,Authorization').split(',')
    CORS_EXPOSE_HEADERS = ['Content-Type']
    CORS_METHODS = os.getenv('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(',')
    CORS_SUPPORTS_CREDENTIALS = os.getenv('CORS_SUPPORTS_CREDENTIALS', 'true').lower() == 'true'
    
    # External system URLs
    ONLINE_SYSTEM_URL = os.getenv('ONLINE_SYSTEM_URL', 'https://onetechapp.ma/sageb2b/')
    ONLINE_SYSTEM_LOGIN_URL = os.getenv('ONLINE_SYSTEM_LOGIN_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=1')
    ONLINE_SYSTEM_ORDERS_URL = os.getenv('ONLINE_SYSTEM_ORDERS_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=')
    ONLINE_SYSTEM_PDF_URL = os.getenv('ONLINE_SYSTEM_PDF_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=')

class DevelopmentConfig(Config):
    """Development configuration"""
    pass

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
