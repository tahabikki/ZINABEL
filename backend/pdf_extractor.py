"""
PDF Extractor Module - Extract and populate database from warehouse PDFs
Uses same proven extraction logic as original system
Works with 4-table schema: orders, order_items, stock_tracking, warehouse_sections (empty)
Now supports in-memory PDF bytes (no local files needed)
"""

import sys
import traceback
from pathlib import Path
import pdfplumber
import re
from datetime import datetime
import io

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import Database


def parse_item_row(row):
    """Parse a single item row - IMPROVED to handle all data correctly (from old system)"""
    try:
        if not row or len(row) < 5:
            return None
        
        barcode = str(row[0]).strip() if row[0] else ''
        reference = str(row[1]).strip() if row[1] else ''
        description = str(row[2]).strip() if row[2] else ''
        
        # Clean up description - remove extra spaces and newlines
        description = ' '.join(description.split())
        
        quantity = 0
        location = 'XXXXXX'
        stock = 0
        
        # Parse quantity (Qté)
        if len(row) > 3 and row[3]:
            try:
                qty_str = str(row[3]).strip().replace(',', '.')
                if qty_str and qty_str != '-' and qty_str != '':
                    quantity = float(qty_str)
            except:
                pass
        
        # Parse location (Emplacement)
        if len(row) > 4 and row[4]:
            location_str = str(row[4]).strip()
            if location_str and location_str != '-' and location_str != '' and location_str != 'Delisté':
                location = location_str
        
        # Parse stock (Stock)
        if len(row) > 5 and row[5]:
            try:
                stock_str = str(row[5]).strip().replace(',', '').replace(' ', '')
                if stock_str and stock_str != '-' and stock_str != '':
                    # Handle negative stock
                    stock = float(stock_str)
            except:
                pass
        
        # Validate required fields
        if not barcode or not reference:
            return None
        
        return {
            'barcode': barcode,
            'reference': reference,
            'description': description,
            'quantity': quantity,
            'location': location,
            'stock': stock,
        }
    
    except:
        return None


def extract_order_from_pdf(pdf_path):
    """Extract order info, customer info, and items from ALL pages including continuation pages"""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            order_data = {
                'order_number': '',
                'reference': '',
                'order_date': '',
                'delivery_date': '',
                'status': 'à préparer',
                'client': '',
                'customer_code': '',
                'address': '',
                'depot': '',
                'preparer': '',
                'items': []
            }
            
            page = pdf.pages[0]
            text = page.extract_text()
            
            # Parse metadata from first page
            if 'N° Pièce' in text:
                try:
                    order_data['order_number'] = re.search(r'N° Pièce\s+(\S+)', text).group(1)
                except:
                    pass
            
            if 'Référence' in text:
                try:
                    order_data['reference'] = re.search(r'Référence\s+(B2B\s+\d+)', text).group(1)
                except:
                    pass
            
            if 'Date' in text:
                try:
                    dates = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
                    if dates:
                        order_data['order_date'] = dates[0]
                        if len(dates) > 1:
                            order_data['delivery_date'] = dates[1]
                except:
                    pass
            
            if 'Statut' in text:
                try:
                    order_data['status'] = re.search(r'Statut\s+(\w+)', text).group(1)
                except:
                    pass
            
            if 'Client' in text:
                try:
                    client_match = re.search(r'Client\s+(.*?)(?:\s+\[|$)', text)
                    if client_match:
                        order_data['client'] = client_match.group(1).strip()
                except:
                    pass
            
            if 'Code' in text:
                try:
                    code_match = re.search(r'Code\s+([A-Z0-9]+)', text)
                    if code_match:
                        order_data['customer_code'] = code_match.group(1)
                except:
                    pass
            
            if 'Adresse livraison' in text:
                try:
                    addr_match = re.search(r'Adresse livraison\s+(\S+)', text)
                    if addr_match:
                        order_data['address'] = addr_match.group(1)
                except:
                    pass
            
            if 'Dépôt' in text:
                try:
                    depot_match = re.search(r'Dépôt\s+(.*?)(?:\n|$)', text)
                    if depot_match:
                        order_data['depot'] = depot_match.group(1).strip()
                except:
                    pass
            
            # Extract items from ALL PAGES including continuation pages
            DEBUG = True
            expected_col_count = None
            
            for page_num, page in enumerate(pdf.pages, 1):
                tables = page.extract_tables()
                if not tables:
                    if DEBUG: print(f"  Page {page_num}: No tables found")
                    continue
                
                for table_idx, table in enumerate(tables):
                    if len(table) < 2:
                        continue
                    
                    # Check if this is the items table
                    header_row = table[0]
                    header_str = ' '.join([str(cell or '') for cell in header_row])
                    
                    # Page 1: Identify header-based items table
                    is_items_table = ('Code à barre' in header_str or 'Code a barre' in header_str or
                                     ('Référence' in header_str and 'Désignation' in header_str))
                    
                    # Continuation pages: Detect table by data pattern (not just headers)
                    is_continuation_table = False
                    if not is_items_table and page_num > 1:
                        # Check if this looks like a data table (has numeric/barcode patterns)
                        data_rows = table[1:] if len(table) > 1 else []
                        if len(data_rows) > 0:
                            # Check first data row for barcode-like pattern in first column
                            first_data_row = data_rows[0]
                            if first_data_row and first_data_row[0]:
                                col0_str = str(first_data_row[0]).strip()
                                # If first column looks like a barcode, this is likely a items table
                                if len(col0_str) >= 3 and (col0_str.isdigit() or (col0_str[0].isalpha() and any(c.isdigit() for c in col0_str))):
                                    is_continuation_table = True
                                    if expected_col_count is None:
                                        expected_col_count = len(table[0])
                                    # Verify column count matches expected
                                    if abs(len(table[0]) - expected_col_count) <= 1:
                                        is_continuation_table = True
                    
                    # Store expected column count from first table found
                    if is_items_table and expected_col_count is None:
                        expected_col_count = len(table[0])
                    
                    if not is_items_table and not is_continuation_table:
                        continue
                    
                    # Process rows - handle multi-line descriptions
                    current_item = None
                    items_from_table = 0
                    
                    # For continuation tables, start from row 0 if no header
                    start_row = 0 if (is_continuation_table and page_num > 1) else 1
                    
                    for row_idx, row in enumerate(table[start_row:], start_row):
                        if not row or all(cell is None or str(cell).strip() == '' for cell in row):
                            continue
                        
                        col0 = str(row[0]).strip() if row[0] else ''
                        col1 = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                        col2 = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                        
                        # Barcode detection
                        is_barcode = (col0 and len(col0) >= 3 and 
                                     (col0.isdigit() or  
                                      (col0[0].isalpha() and any(c.isdigit() for c in col0))))
                        
                        # NEW ITEM = has barcode AND has reference
                        is_new_item = is_barcode and col1
                        
                        if is_new_item:
                            # Save previous item if exists
                            if current_item:
                                item = parse_item_row(current_item)
                                if item:
                                    order_data['items'].append(item)
                                    items_from_table += 1
                            # Start new item
                            current_item = list(row)
                        elif current_item and col2:
                            # This is a continuation of multi-line description
                            current_item[2] = str(current_item[2] or '') + ' ' + col2
                    
                    # Don't forget the last item
                    if current_item:
                        item = parse_item_row(current_item)
                        if item:
                            order_data['items'].append(item)
                            items_from_table += 1
                    
                    table_type = "HEADER" if is_items_table else "CONTINUATION"
                    if DEBUG: print(f"  Page {page_num}, Table {table_idx} [{table_type}]: {items_from_table} items extracted")
            
            if DEBUG: print(f"\n✅ Total items extracted: {len(order_data['items'])}\n")
            return order_data
    
    except Exception as e:
        print(f"    ❌ Error extracting PDF: {e}")
        traceback.print_exc()
        return None


def extract_order_from_pdf_bytes(pdf_bytes, order_id):
    """Extract order info from PDF bytes (in-memory, no disk needed)"""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            order_data = {
                'order_number': order_id,
                'reference': '',
                'order_date': '',
                'delivery_date': '',
                'status': 'à préparer',
                'client': '',
                'customer_code': '',
                'address': '',
                'depot': '',
                'preparer': '',
                'items': []
            }
            
            if len(pdf.pages) == 0:
                return None
            
            page = pdf.pages[0]
            text = page.extract_text()
            
            # Parse metadata (same as file version)
            if 'Référence' in text:
                try:
                    order_data['reference'] = re.search(r'Référence\s+(B2B\s+\d+)', text).group(1)
                except:
                    pass
            
            if 'Date' in text:
                try:
                    dates = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
                    if dates:
                        order_data['order_date'] = dates[0]
                        if len(dates) > 1:
                            order_data['delivery_date'] = dates[1]
                except:
                    pass
            
            if 'Statut' in text:
                try:
                    order_data['status'] = re.search(r'Statut\s+(\w+)', text).group(1)
                except:
                    pass
            
            if 'Client' in text:
                try:
                    client_match = re.search(r'Client\s+(.*?)(?:\s+\[|$)', text)
                    if client_match:
                        order_data['client'] = client_match.group(1).strip()
                except:
                    pass
            
            # Extract items from table (same logic as file version)
            try:
                for page_num, page in enumerate(pdf.pages, 1):
                    tables = page.extract_tables()
                    if not tables:
                        continue
                    
                    for table in tables:
                        if len(table) < 2:
                            continue
                        
                        # Skip header and extract items
                        for row in table[1:]:
                            item = parse_item_row(row)
                            if item:
                                order_data['items'].append(item)
            except:
                pass
            
            return order_data if order_data['items'] else None
            
    except Exception as e:
        print(f"❌ Error extracting from bytes for {order_id}: {str(e)}")
        return None


def import_all_pdfs():
    """Import all PDFs from pdfs/ folder using same logic as old system"""
    db = Database()
    pdfs_folder = Path(__file__).parent.parent / 'pdfs'
    
    if not pdfs_folder.exists():
        print(f"❌ PDF folder not found: {pdfs_folder}")
        return 0
    
    pdf_files = sorted([f for f in pdfs_folder.glob('*.pdf')])
    print(f"\n📁 Found {len(pdf_files)} PDF files\n")
    
    imported_count = 0
    total_items = 0
    
    for pdf_file in pdf_files:
        print(f"📄 {pdf_file.name}...", end=" ")
        
        try:
            data = extract_order_from_pdf(str(pdf_file))
            
            if not data or not data['order_number']:
                print("❌ No order number")
                continue
            
            # Check if order already exists
            existing = db.get_order(data['order_number'])
            if existing:
                print("⏭️  Already imported")
                continue
            
            # 1. Insert order
            db.add_order(data)
            
            # 2. Insert items and track stock
            for item in data.get('items', []):
                # Add order item (denormalized structure)
                order_item_data = {
                    'order_number': data['order_number'],
                    'barcode': item['barcode'],
                    'reference': item['reference'],
                    'description': item['description'],
                    'quantity': item['quantity'],
                    'warehouse_location': item.get('location', 'XXXXXX'),
                    'stock': item.get('stock', 0)
                }
                db.add_order_item(order_item_data)
                
                # Add/update stock tracking
                stock_data = {
                    'reference': item['reference'],
                    'barcode': item['barcode'],
                    'warehouse_location': item.get('location', 'XXXXXX'),
                    'current_stock': item.get('stock', 0),
                    'reorder_level': 10
                }
                db.add_or_update_stock(stock_data)
            
            item_count = len(data['items'])
            total_items += item_count
            print(f"✅ {item_count} items")
            imported_count += 1
        
        except Exception as e:
            print(f"❌ {str(e)[:50]}")
            traceback.print_exc()
    
    print(f"\n✨ Imported: {imported_count} orders, {total_items} items\n")
    return imported_count


if __name__ == '__main__':
    print("\n" + "="*60)
    print("📦 PDF Extraction Module - 4 Table Schema")
    print("="*60 + "\n")
    
    import_all_pdfs()
    
    print("✅ Done!")
