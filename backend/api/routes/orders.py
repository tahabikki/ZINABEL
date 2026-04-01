from flask import Blueprint, jsonify, request
import sys
import os
from pathlib import Path
import tempfile
import urllib.request
import pdfplumber

# Add workspace root to path for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db
from pdf_extractor import extract_order_from_pdf

# Import from backend.utils with absolute path
from backend.utils import get_current_orders_from_online

# External system URL configuration
ONLINE_SYSTEM_PDF_URL = os.getenv('ONLINE_SYSTEM_PDF_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=')

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('', methods=['GET'])
def get_orders():
    """Get all current orders from DATABASE (fast local query!) with optional date filter"""
    try:
        # Get optional date filter from query params (format: YYYY-MM-DD from date picker)
        filter_date = request.args.get('date', None)
        
        # Query LOCAL database instead of online system
        orders = db.get_orders()
        
        # Filter by date if provided
        if filter_date:
            # Convert filter date from YYYY-MM-DD to DD/MM/YYYY to match stored format
            from datetime import datetime
            try:
                date_obj = datetime.strptime(filter_date, '%Y-%m-%d')
                formatted_filter_date = date_obj.strftime('%d/%m/%Y')
                orders = [order for order in orders if order.get('order_date', '').strip() == formatted_filter_date]
            except ValueError:
                # If date format is invalid, return empty
                orders = []
        
        order_ids = [order['order_number'] for order in orders]
        return jsonify({'orders': order_ids, 'count': len(order_ids)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/<order_number>', methods=['GET'])
def get_order(order_number):
    """Get specific order with all items"""
    try:
        order = db.get_order(order_number)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Get order items
        items = db.get_order_items(order_number)
        
        result = dict(order)
        result['items'] = items
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/import/online/<order_id>', methods=['POST'])
def import_order_from_online(order_id):
    """Import order from online PDF without downloading to disk"""
    try:
        # Construct the online PDF URL from environment
        pdf_url = ONLINE_SYSTEM_PDF_URL + order_id
        
        print(f"📥 Fetching PDF from: {pdf_url}")
        
        # Fetch PDF directly from online source
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            try:
                # Download PDF to temporary file
                urllib.request.urlretrieve(pdf_url, tmp_file.name)
                tmp_path = tmp_file.name
                
                # Parse the PDF using existing extraction function
                order_data = extract_order_from_pdf(tmp_path)
                
                if not order_data:
                    return jsonify({'error': 'Could not extract order data from PDF'}), 400
                
                # Check if order already exists
                existing = db.get_order(order_data.get('order_number'))
                if existing:
                    return jsonify({
                        'warning': 'Order already exists',
                        'order_number': order_data.get('order_number'),
                        'action': 'skipped'
                    }), 200
                
                # Add order to database
                db.add_order(order_data)
                
                # Add order items
                items_count = 0
                for item in order_data.get('items', []):
                    db.add_order_item(item)
                    items_count += 1
                
                return jsonify({
                    'success': True,
                    'order_number': order_data.get('order_number'),
                    'client': order_data.get('client'),
                    'items_imported': items_count,
                    'message': f"✅ Order {order_data.get('order_number')} imported successfully with {items_count} items"
                }), 201
                
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
    except urllib.error.URLError as e:
        return jsonify({'error': f'Failed to fetch PDF from online: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Error importing order: {str(e)}'}), 500

@orders_bp.route('', methods=['POST'])
def create_order():
    """Create new order in database"""
    try:
        data = request.json
        order_id = db.add_order(data)
        return jsonify({'id': order_id, **data}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

