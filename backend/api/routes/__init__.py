# API Routes Package
from flask import Blueprint

def create_routes():
    from .orders import orders_bp
    from .products import products_bp
    from .warehouse import warehouse_bp
    from .stock import stock_bp
    from .reports import reports_bp
    from .pdfs import pdfs_bp
    from .sync import sync_bp
    from .auth import auth_bp
    
    return [orders_bp, products_bp, warehouse_bp, stock_bp, reports_bp, pdfs_bp, sync_bp, auth_bp]

# Import blueprints for registration
from .orders import orders_bp
from .products import products_bp
from .warehouse import warehouse_bp
from .stock import stock_bp
from .reports import reports_bp
from .pdfs import pdfs_bp
from .sync import sync_bp
from .auth import auth_bp
from .sync import sync_bp

__all__ = ['orders_bp', 'products_bp', 'warehouse_bp', 'stock_bp', 'reports_bp', 'pdfs_bp']
