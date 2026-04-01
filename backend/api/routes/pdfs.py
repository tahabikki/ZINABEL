from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename
import os
import sys
from pathlib import Path
from io import BytesIO
from datetime import datetime

try:
    from xhtml2pdf import pisa
    PDF_GENERATION_AVAILABLE = True
except ImportError:
    PDF_GENERATION_AVAILABLE = False

sys.path.insert(0, str(Path(__file__).parent.parent))

# Import templates
try:
    from .pdf_templates import get_invoice_html_template
except ImportError:
    get_invoice_html_template = None

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import db

# PDF upload folder
UPLOAD_FOLDER = Path(__file__).parent.parent.parent / 'pdfs'
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename: str | None) -> bool:
    """Validate PDF file extension"""
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

pdfs_bp = Blueprint('pdfs', __name__)

@pdfs_bp.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload PDF files to server"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Check file exists and has name
    if not file or not file.filename:
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files allowed'}), 400
    
    # Save file securely
    try:
        filename = secure_filename(file.filename)
        UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
        filepath = UPLOAD_FOLDER / filename
        file.save(str(filepath))
        
        return jsonify({
            'message': 'PDF uploaded successfully',
            'filename': filename,
            'path': str(filepath)
        }), 201
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@pdfs_bp.route('/list', methods=['GET'])
def list_pdfs():
    """List all uploaded PDFs"""
    try:
        if UPLOAD_FOLDER.exists():
            pdfs = [f.name for f in UPLOAD_FOLDER.glob('*.pdf')]
            return jsonify({'pdfs': pdfs, 'count': len(pdfs)})
        return jsonify({'pdfs': [], 'count': 0})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pdfs_bp.route('/generate', methods=['POST'])
def generate_pdf():
    """Generate professional PDF from invoice data using xhtml2pdf"""
    
    if not PDF_GENERATION_AVAILABLE:
        return jsonify({
            'error': 'PDF generation not available. Install: pip install xhtml2pdf'
        }), 500
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Support both direct HTML and structured invoice data
        if 'html' in data:
            # Direct HTML mode
            html_content = data.get('html')
            filename = data.get('filename', 'document.pdf')
        elif 'invoice_data' in data:
            # Structured invoice mode - generate from template
            invoice_data = data.get('invoice_data')
            html_content = get_invoice_html_template(invoice_data)
            filename = f"{invoice_data.get('order_id', 'invoice')}.pdf"
        else:
            return jsonify({'error': 'Either "html" or "invoice_data" required'}), 400
        
        filename = secure_filename(filename) or 'document.pdf'
        
        # Generate PDF using xhtml2pdf
        pdf_bytes = BytesIO()
        
        try:
            pisa_status = pisa.CreatePDF(
                html_content,              # HTML content
                pdf_bytes,                 # Output file-like object
                encoding='UTF-8',
                show_error_as_pdf=False
            )
            
            if pisa_status.err or pdf_bytes.getvalue() == b'':
                return jsonify({'error': 'PDF generation failed. Check HTML content.'}), 500
            
        except Exception as pisa_err:
            return jsonify({'error': f'PDF generation error: {str(pisa_err)}'}), 500
        
        pdf_bytes.seek(0)
        pdf_content = pdf_bytes.getvalue()
        
        # Optionally save to disk for archiving
        if data.get('save_locally'):
            UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            filepath = UPLOAD_FOLDER / filename
            with open(str(filepath), 'wb') as f:
                f.write(pdf_content)
        
        # Return PDF file
        pdf_bytes.seek(0)
        return send_file(
            pdf_bytes,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        print(f"❌ PDF generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500


@pdfs_bp.route('/generate-invoice', methods=['POST'])
def generate_invoice_pdf():
    """Generate professional collection invoice PDF from structured data"""
    
    if not PDF_GENERATION_AVAILABLE:
        return jsonify({
            'error': 'PDF generation not available. Install: pip install xhtml2pdf'
        }), 500
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No invoice data provided'}), 400
        
        # Parse invoice data
        invoice_data = {
            'order_id': data.get('order_id', 'PL000000'),
            'client': data.get('client', 'UNKNOWN'),
            'date': data.get('date', datetime.now().strftime('%d/%m/%Y')),
            'sections': data.get('sections', {}),
            'zero_stock_items': data.get('zero_stock_items', []),
            'negative_stock_items': data.get('negative_stock_items', []),
            'total_locations': data.get('total_locations', 0),
            'generated_date': datetime.now().strftime('%d/%m/%Y, %H:%M:%S')
        }
        
        # Generate HTML from template
        html_content = get_invoice_html_template(invoice_data)
        
        # Generate PDF
        pdf_bytes = BytesIO()
        
        try:
            pisa_status = pisa.CreatePDF(
                html_content,
                pdf_bytes,
                encoding='UTF-8',
                show_error_as_pdf=False
            )
            
            if pisa_status.err:
                return jsonify({'error': 'PDF generation failed'}), 500
            
        except Exception as pisa_err:
            return jsonify({'error': f'PDF error: {str(pisa_err)}'}), 500
        
        pdf_bytes.seek(0)
        filename = f"Invoice-{invoice_data['order_id']}.pdf"
        
        # Save locally if requested
        if data.get('save_locally'):
            UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            filepath = UPLOAD_FOLDER / filename
            with open(str(filepath), 'wb') as f:
                f.write(pdf_bytes.getvalue())
        
        pdf_bytes.seek(0)
        return send_file(
            pdf_bytes,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        print(f"❌ Invoice PDF generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Invoice generation failed: {str(e)}'}), 500
