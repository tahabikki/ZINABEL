from flask import Blueprint, jsonify
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db

warehouse_bp = Blueprint('warehouse', __name__)

@warehouse_bp.route('', methods=['GET'])
def get_warehouse():
    """Get all warehouse locations from order_items"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get unique locations
        cursor.execute('''
            SELECT DISTINCT warehouse_location
            FROM order_items
            WHERE warehouse_location != "XXXXXX"
            ORDER BY warehouse_location
        ''')
        locations = [row[0] for row in cursor.fetchall()]
        
        # Extract unique sections (first part before -)
        sections = sorted(set([loc.split('-')[0] if '-' in loc else loc[0] for loc in locations]))
        
        conn.close()
        return jsonify({'sections': sections, 'locations': locations})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/section/<section>', methods=['GET'])
def get_section(section):
    """Get specific warehouse section with all items"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get all locations in this section
        cursor.execute('''
            SELECT DISTINCT warehouse_location
            FROM order_items
            WHERE warehouse_location LIKE ?
            ORDER BY warehouse_location
        ''', (f'{section}%',))
        locations = [row[0] for row in cursor.fetchall()]
        
        if not locations:
            conn.close()
            return jsonify({'error': 'Section not found'}), 404
        
        # Get items for each location
        location_details = []
        for loc in locations:
            cursor.execute('''
                SELECT COUNT(*) as item_count, SUM(quantity) as total_qty
                FROM order_items
                WHERE warehouse_location = ?
            ''', (loc,))
            loc_stat = dict(cursor.fetchone())
            
            cursor.execute('''
                SELECT reference, current_stock
                FROM stock_tracking
                WHERE warehouse_location = ?
                ORDER BY reference
            ''', (loc,))
            stock_items = [dict(row) for row in cursor.fetchall()]
            
            location_details.append({
                'location': loc,
                'item_count': loc_stat['item_count'],
                'total_qty': loc_stat['total_qty'] or 0,
                'stock_items': stock_items
            })
        
        conn.close()
        return jsonify({'section': section, 'locations': location_details})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/locations', methods=['GET'])
def get_locations():
    """Get all unique warehouse locations with stats"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT warehouse_location, COUNT(*) as item_count, SUM(quantity) as total_qty
            FROM order_items
            WHERE warehouse_location != "XXXXXX"
            GROUP BY warehouse_location
            ORDER BY warehouse_location
        ''')
        locations = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify({'locations': locations})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

