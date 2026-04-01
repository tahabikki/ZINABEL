from flask import Blueprint, jsonify
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db

stock_bp = Blueprint('stock', __name__)

@stock_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Get all low stock alerts from stock_tracking"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT reference, barcode, warehouse_location, current_stock, reorder_level, last_updated
            FROM stock_tracking
            WHERE current_stock < reorder_level
            ORDER BY current_stock ASC, reference
        ''')
        alerts = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(alerts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/low', methods=['GET'])
def get_low_stock():
    """Get low stock items (below reorder level)"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT reference, barcode, warehouse_location, current_stock, reorder_level, last_updated
            FROM stock_tracking
            WHERE current_stock < reorder_level AND current_stock > 0
            ORDER BY current_stock ASC, reference
        ''')
        low_stock = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(low_stock)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/out', methods=['GET'])
def get_out_of_stock():
    """Get out of stock items (stock = 0)"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT reference, barcode, warehouse_location, current_stock, reorder_level, last_updated
            FROM stock_tracking
            WHERE current_stock = 0
            ORDER BY reference
        ''')
        out_of_stock = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(out_of_stock)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
