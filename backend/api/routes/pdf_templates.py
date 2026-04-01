"""Professional PDF templates for Invoice generation"""

def get_invoice_html_template(invoice_data):
    """Generate professional invoice HTML with embedded CSS"""
    
    sections_html = ""
    total_items = 0
    total_qty = 0
    
    # Build sections dynamically
    for section_name, items in invoice_data.get('sections', {}).items():
        if not items:
            continue
            
        section_qty = sum(item['qty'] for item in items)
        total_items += len(items)
        total_qty += section_qty
        
        # Build table rows
        rows = ""
        for item in items:
            stock_class = ""
            stock_text = str(item.get('stock', 0))
            
            if item.get('stock', 0) < 0:
                stock_class = "stock-negative"
            elif item.get('stock', 0) == 0:
                stock_class = "stock-zero"
            
            rows += f"""
            <tr>
                <td class="location">{item.get('location', 'N/A')}</td>
                <td class="product">{item.get('product_id', 'N/A')}</td>
                <td class="description">{item.get('product_name', 'N/A')}</td>
                <td class="quantity"><strong>{item['qty']}</strong></td>
                <td class="stock {stock_class}"><strong>{stock_text}</strong></td>
            </tr>
            """
        
        sections_html += f"""
        <div class="section">
            <div class="section-header">{section_name}</div>
            <div class="section-stats">{len(items)} items | Qty: {section_qty}</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Product ID</th>
                        <th>Description</th>
                        <th width="60">Qty</th>
                        <th width="70">Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>
        """
    
    # Build alerts for zero/negative stock
    alerts_html = ""
    zero_items = invoice_data.get('zero_stock_items', [])
    negative_items = invoice_data.get('negative_stock_items', [])
    
    if zero_items:
        alerts_html += f"""
        <div class="alert alert-warning">
            <strong>⚠️ Zero Stock Alert:</strong> {len(zero_items)} items have no available stock
        </div>
        """
    
    if negative_items:
        alerts_html += f"""
        <div class="alert alert-danger">
            <strong>🔴 Negative Stock Alert:</strong> {len(negative_items)} items have insufficient stock
        </div>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Arial', 'Helvetica', sans-serif;
                color: #333;
                line-height: 1.4;
                background: white;
            }}
            
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
            }}
            
            .header h1 {{
                font-size: 28px;
                margin-bottom: 10px;
            }}
            
            .header-meta {{
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 5px;
            }}
            
            .meta-item {{
                text-align: center;
            }}
            
            .meta-label {{
                font-size: 11px;
                opacity: 0.8;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            
            .meta-value {{
                font-size: 18px;
                font-weight: bold;
            }}
            
            .order-info {{
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }}
            
            .info-box {{
                background: #f8f9fa;
                padding: 15px;
                border-left: 4px solid #667eea;
                border-radius: 4px;
            }}
            
            .info-label {{
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            
            .info-value {{
                font-size: 16px;
                font-weight: bold;
                color: #333;
            }}
            
            .section {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}
            
            .section-header {{
                background: #667eea;
                color: white;
                padding: 12px 15px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px 5px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            
            .section-stats {{
                background: #f0f0f0;
                padding: 8px 15px;
                font-size: 12px;
                color: #666;
                border-bottom: 1px solid #ddd;
            }}
            
            .items-table {{
                width: 100%;
                border-collapse: collapse;
                background: white;
            }}
            
            .items-table thead {{
                background: #f0f0f0;
            }}
            
            .items-table th {{
                padding: 12px;
                text-align: left;
                font-weight: bold;
                font-size: 11px;
                color: #333;
                border-bottom: 2px solid #667eea;
                text-transform: uppercase;
            }}
            
            .items-table td {{
                padding: 10px 12px;
                border-bottom: 1px solid #eee;
                font-size: 12px;
            }}
            
            .items-table tbody tr:nth-child(even) {{
                background: #fafafa;
            }}
            
            .items-table tbody tr:hover {{
                background: #f5f5f5;
            }}
            
            .location {{
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #667eea;
                font-size: 11px;
            }}
            
            .product {{
                font-weight: bold;
                color: #333;
            }}
            
            .description {{
                color: #666;
                font-size: 11px;
            }}
            
            .quantity {{
                text-align: center;
                font-weight: bold;
                color: #28a745;
            }}
            
            .stock {{
                text-align: center;
                font-weight: bold;
            }}
            
            .stock-negative {{
                background: #fee !important;
                color: #dc3545 !important;
                padding: 3px 6px;
                border-radius: 3px;
            }}
            
            .stock-zero {{
                color: #ff9800;
            }}
            
            .alert {{
                padding: 12px 15px;
                border-radius: 5px;
                margin-bottom: 15px;
                font-size: 12px;
                border-left: 4px solid;
            }}
            
            .alert-warning {{
                background: #fff3cd;
                border-left-color: #ffc107;
                color: #856404;
            }}
            
            .alert-danger {{
                background: #f8d7da;
                border-left-color: #dc3545;
                color: #721c24;
            }}
            
            .summary {{
                background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%);
                border: 2px solid #667eea;
                border-radius: 6px;
                padding: 20px;
                margin-top: 20px;
            }}
            
            .summary-title {{
                font-size: 14px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 15px;
                text-transform: uppercase;
            }}
            
            .summary-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 10px;
            }}
            
            .summary-item {{
                background: white;
                padding: 12px;
                border-radius: 5px;
                text-align: center;
                border: 1px solid #e0e0e0;
            }}
            
            .summary-item-label {{
                font-size: 10px;
                color: #666;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            
            .summary-item-value {{
                font-size: 20px;
                font-weight: bold;
                color: #667eea;
            }}
            
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #e0e0e0;
                text-align: center;
                font-size: 11px;
                color: #999;
            }}
            
            @page {{
                size: A4;
                margin: 15mm;
            }}
            
            @media print {{
                body {{ padding: 0; }}
                .container {{ padding: 0; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>📦 COLLECTION ORDER INVOICE</h1>
                <div class="header-meta">
                    <div class="meta-item">
                        <div class="meta-label">Order #</div>
                        <div class="meta-value">{invoice_data.get('order_id', 'N/A')}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Client</div>
                        <div class="meta-value">{invoice_data.get('client', 'N/A')}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Date</div>
                        <div class="meta-value">{invoice_data.get('date', 'N/A')}</div>
                    </div>
                </div>
            </div>
            
            <!-- Order Info -->
            <div class="order-info">
                <div class="info-box">
                    <div class="info-label">Total Items</div>
                    <div class="info-value">{total_items}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Total Quantity</div>
                    <div class="info-value">{total_qty:,}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Sections</div>
                    <div class="info-value">{len(invoice_data.get('sections', {}))}</div>
                </div>
            </div>
            
            <!-- Alerts -->
            {alerts_html}
            
            <!-- Sections -->
            {sections_html}
            
            <!-- Summary -->
            <div class="summary">
                <div class="summary-title">📊 Collection Summary</div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-item-label">Total Items</div>
                        <div class="summary-item-value">{total_items}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-item-label">Total Quantity</div>
                        <div class="summary-item-value">{total_qty:,}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-item-label">Sections</div>
                        <div class="summary-item-value">{len(invoice_data.get('sections', {}))}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-item-label">Locations</div>
                        <div class="summary-item-value">{invoice_data.get('total_locations', 0)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>ZINABEL - Professional Warehouse Management System</p>
                <p>Generated: {invoice_data.get('generated_date', 'N/A')}</p>
                <p>Follow the sections and locations in order to collect items efficiently without backtracking</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html
