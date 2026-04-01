import sqlite3
from pathlib import Path
from datetime import datetime
import json

# Database location - in ZINABEL SYSTEM/database/
DB_PATH = Path(__file__).parent.parent / 'database' / 'zinabel.db'
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

class Database:
    """SQLite Database handler for ZINABEL"""
    
    def __init__(self):
        self.db_path = DB_PATH
        # Create a persistent connection for direct cursor access (used by sync_manager)
        self.conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute('PRAGMA journal_mode=WAL')
        self.cursor = self.conn.cursor()
        self.init_db()
    
    def get_connection(self):
        """Get database connection"""
        # Set timeout to 30 seconds to prevent "database is locked" errors during bulk operations
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row  # Return rows as dicts
        # Enable WAL mode for better concurrent write performance
        conn.execute('PRAGMA journal_mode=WAL')
        return conn
    
    def close(self):
        """Close the persistent connection"""
        if self.conn:
            self.conn.close()
    
    def init_db(self):
        """Initialize database tables - 4 table schema"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 1. Orders table - order header information
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                order_number TEXT PRIMARY KEY,
                reference TEXT,
                order_date TEXT,
                delivery_date TEXT,
                status TEXT DEFAULT 'apreparer',
                client TEXT NOT NULL,
                customer_code TEXT,
                address TEXT,
                depot TEXT,
                preparer TEXT,
                imported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 2. Order Items table - DENORMALIZED: all order item details in one row
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL,
                barcode TEXT,
                reference TEXT NOT NULL,
                description TEXT,
                quantity INTEGER NOT NULL,
                warehouse_location TEXT,
                stock INTEGER DEFAULT 0,
                FOREIGN KEY (order_number) REFERENCES orders(order_number)
            )
        ''')
        
        # 3. Stock Tracking table - track stock levels per location
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference TEXT NOT NULL,
                barcode TEXT,
                warehouse_location TEXT NOT NULL,
                current_stock INTEGER DEFAULT 0,
                reorder_level INTEGER DEFAULT 10,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 4. Warehouse Sections table - warehouse structure (sections, aisles, shelves, bins)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS warehouse_sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section TEXT NOT NULL,
                aisle TEXT NOT NULL,
                shelf TEXT NOT NULL,
                bin TEXT NOT NULL,
                location_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ⚡ CREATE INDEXES FOR FASTER QUERIES (Ultra Real-Time Performance)
        # Index on frequently searched columns in orders table
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(reference)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC)')
        
        # Index on order_items for faster lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_items_order_number ON order_items(order_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_items_reference ON order_items(reference)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_items_barcode ON order_items(barcode)')
        
        # Index on stock_tracking for real-time stock updates
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_stock_reference ON stock_tracking(reference)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_stock_location ON stock_tracking(warehouse_location)')
        
        # Index on warehouse_sections for location queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sections_location_code ON warehouse_sections(location_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sections_section ON warehouse_sections(section)')
        
        conn.commit()
        conn.close()
    
    # ============ ORDERS ============
    def add_order(self, order_data):
        """Add new order"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR IGNORE INTO orders 
            (order_number, reference, order_date, delivery_date, status, client, 
             customer_code, address, depot, preparer, imported_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_data.get('order_number'),
            order_data.get('reference'),
            order_data.get('order_date'),
            order_data.get('delivery_date'),
            order_data.get('status', 'apreparer'),
            order_data.get('client'),
            order_data.get('customer_code'),
            order_data.get('address'),
            order_data.get('depot'),
            order_data.get('preparer'),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        return order_data.get('order_number')
    
    def get_orders(self):
        """Get all orders"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders ORDER BY imported_date DESC')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_order(self, order_number):
        """Get specific order"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE order_number = ?', (order_number,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    # ============ ORDER ITEMS ============
    def add_order_item(self, order_item_data):
        """Add item to order (denormalized structure)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Use stock value directly from order_item_data (from PDF extraction)
        current_stock = order_item_data.get('stock', 0)
        
        cursor.execute('''
            INSERT INTO order_items 
            (order_number, barcode, reference, description, quantity, warehouse_location, stock)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_item_data.get('order_number'),
            order_item_data.get('barcode'),
            order_item_data.get('reference'),
            order_item_data.get('description'),
            order_item_data.get('quantity'),
            order_item_data.get('warehouse_location'),
            current_stock
        ))
        
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return item_id
    
    def get_order_items(self, order_number):
        """Get items for specific order"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM order_items 
            WHERE order_number = ?
            ORDER BY warehouse_location
        ''', (order_number,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_all_order_items(self):
        """Get all order items"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM order_items ORDER BY order_number, warehouse_location')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    # ============ STOCK TRACKING ============
    def add_or_update_stock(self, stock_data):
        """Add or update stock tracking"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO stock_tracking 
            (reference, barcode, warehouse_location, current_stock, reorder_level, last_updated)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            stock_data.get('reference'),
            stock_data.get('barcode'),
            stock_data.get('warehouse_location'),
            stock_data.get('current_stock', 0),
            stock_data.get('reorder_level', 10),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def get_stock_tracking(self):
        """Get all stock tracking records"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM stock_tracking 
            ORDER BY reference, warehouse_location
        ''')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_stock_by_location(self, warehouse_location):
        """Get stock for specific warehouse location"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM stock_tracking 
            WHERE warehouse_location = ?
            ORDER BY reference
        ''', (warehouse_location,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    # ============ WAREHOUSE SECTIONS ============
    def add_warehouse_section(self, section_data):
        """Add warehouse section"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR IGNORE INTO warehouse_sections 
            (section, aisle, shelf, bin, location_code)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            section_data.get('section'),
            section_data.get('aisle'),
            section_data.get('shelf'),
            section_data.get('bin'),
            section_data.get('location_code')
        ))
        
        conn.commit()
        conn.close()
    
    def get_warehouse_sections(self):
        """Get all warehouse sections"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM warehouse_sections 
            ORDER BY section, aisle, shelf, bin
        ''')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_sections_by_location(self, section):
        """Get warehouse structure for a section"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM warehouse_sections 
            WHERE section = ?
            ORDER BY aisle, shelf, bin
        ''', (section,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    # ============ STATISTICS ============
    def get_stats(self):
        """Get database statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as count FROM orders')
        total_orders = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(DISTINCT reference) as count FROM order_items')
        total_products = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(DISTINCT warehouse_location) as count FROM order_items WHERE warehouse_location != "XXXXXX"')
        total_locations = cursor.fetchone()['count'] or 0
        
        cursor.execute('SELECT SUM(quantity) as total FROM order_items')
        total_items = cursor.fetchone()['total'] or 0
        
        cursor.execute('SELECT COUNT(*) as count FROM stock_tracking')
        stock_items = cursor.fetchone()['count']
        
        conn.close()
        
        return {
            'total_orders': total_orders,
            'total_products': total_products,
            'total_locations': total_locations,
            'total_items': total_items,
            'stock_tracking_items': stock_items
        }

# Global database instance
db = Database()
