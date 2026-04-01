from flask import Blueprint, jsonify, request
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db

products_bp = Blueprint('products', __name__)

@products_bp.route('', methods=['GET'])
def get_products():
    """Get all unique products from order_items"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT reference, barcode, description
            FROM order_items
            ORDER BY reference
        ''')
        products = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/search', methods=['GET'])
def search_products():
    """Search products by reference or description"""
    try:
        q = request.args.get('q', '').lower()
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT reference, barcode, description
            FROM order_items
            WHERE LOWER(reference) LIKE ? OR LOWER(description) LIKE ?
            ORDER BY reference
        ''', (f'%{q}%', f'%{q}%'))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/with-quantities', methods=['GET'])
def get_products_with_quantities():
    """Get all products with total quantities across all orders"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                reference,
                barcode,
                description,
                SUM(quantity) as total_quantity
            FROM order_items
            GROUP BY reference
            ORDER BY total_quantity DESC, reference
        ''')
        products = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<reference>', methods=['GET'])
def get_product(reference):
    """Get product by reference with stock info"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT reference, barcode, description
            FROM order_items
            WHERE reference = ?
        ''', (reference,))
        product = cursor.fetchone()
        
        if not product:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404
        
        # Get stock tracking info for this product
        cursor.execute('''
            SELECT warehouse_location, current_stock
            FROM stock_tracking
            WHERE reference = ?
            ORDER BY warehouse_location
        ''', (reference,))
        stock_info = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        result = dict(product)
        result['stock_locations'] = stock_info
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

