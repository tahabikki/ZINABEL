from flask import Blueprint, jsonify
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('', methods=['GET'])
def get_reports():
    """Get report summary from database"""
    try:
        stats = db.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/export/csv', methods=['GET'])
def export_csv():
    """Export data as CSV"""
    try:
        # TODO: Generate CSV from database
        return jsonify({'message': 'CSV export coming soon'}), 501
    except Exception as e:
        return jsonify({'error': str(e)}), 500
