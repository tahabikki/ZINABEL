"""
SYNC ORDERS ENDPOINT - Automated synchronization with online system
- Compares online orders with database
- Downloads new PDFs automatically  
- Removes deleted orders from database
- Extracts data and updates DB with proper error handling
- PRODUCTION READY for Vercel deployment
"""

from flask import Blueprint, jsonify, request
import sys
from pathlib import Path
import os
import glob
import time
import requests
import shutil
from concurrent.futures import ThreadPoolExecutor
import logging
from datetime import datetime

# Add workspace root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.utils.online_system import setup_driver, login_to_online, navigate_to_commandes, set_filters, scrape_pieces
from backend.database import db
from backend.pdf_extractor import extract_order_from_pdf
from backend.config import config
from backend.credentials_manager import get_credentials, has_credentials

sync_bp = Blueprint('sync', __name__)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
# Do not keep real credentials in code — default to empty so users must provide them.
USERNAME = os.getenv('ONLINE_USERNAME', '')
PASSWORD = os.getenv('ONLINE_PASSWORD', '')
SYNC_TOKEN = os.getenv('SYNC_TOKEN', '')
ONLINE_SYSTEM_PDF_URL = os.getenv('ONLINE_SYSTEM_PDF_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=')


def verify_sync_token(request):
    """Verify sync token from request header"""
    if not SYNC_TOKEN:
        # If no token configured, allow all (dev mode)
        return True
    
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '')
    return token == SYNC_TOKEN


def get_online_orders(username=None, password=None):
    """
    Fetch all active orders from online system
    Returns: set of order IDs or None if error
    """
    try:
        logger.info("📡 Connecting to online system...")
        driver = setup_driver()
        
        # Use provided credentials, or get from storage, or fall back to env
        if not username or not password:
            # Try to get from stored credentials (from user login)
            if has_credentials():
                username, password = get_credentials()
            else:
                # Fall back to environment variables
                username, password = USERNAME, PASSWORD
        
        success, msg = login_to_online(driver, user_username=username, user_password=password)
        if not success:
            logger.error(f"❌ Login failed: {msg}")
            driver.quit()
            return None
        
        if not navigate_to_commandes(driver):
            logger.error("❌ Navigation failed")
            driver.quit()
            return None
        
        if not set_filters(driver):
            logger.warning("⚠️ Filter error - continuing anyway...")
        
        online_orders = set(scrape_pieces(driver))
        logger.info(f"✓ Got {len(online_orders)} orders from online")
        
        # Keep driver alive for PDF download
        return online_orders, driver
        
    except Exception as e:
        logger.error(f"❌ Error fetching online orders: {str(e)}")
        if 'driver' in locals():
            driver.quit()
        return None


def get_db_orders():
    """Get all order numbers from local database"""
    try:
        orders = db.get_orders()
        return set(order['order_number'] for order in orders)
    except Exception as e:
        logger.error(f"❌ Error fetching DB orders: {str(e)}")
        return set()


def download_pdfs(new_orders, session):
    """
    Download PDFs for new orders - RETURNS IN-MEMORY BYTES (no disk write)
    Uses existing HTTP session with authentication cookies
    Returns: {order_id: pdf_bytes} dict
    """
    if not new_orders:
        logger.info("✓ No new PDFs to download")
        return {}
    
    logger.info(f"📥 Downloading {len(new_orders)} new PDFs (in-memory)...")
    
    pdf_bytes_dict = {}
    
    def download_single_pdf(order_id):
        try:
            pdf_url = ONLINE_SYSTEM_PDF_URL + order_id
            response = session.get(pdf_url, timeout=30)
            if response.status_code == 200:
                logger.info(f"  ✓ Downloaded {order_id}")
                return order_id, response.content
            else:
                logger.warning(f"  ⚠️ HTTP {response.status_code} for {order_id}")
                return order_id, None
        except Exception as e:
            logger.error(f"  ❌ Error downloading {order_id}: {str(e)[:60]}")
            return order_id, None
    
    # Download with 2 parallel workers
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(download_single_pdf, new_orders))
    
    for order_id, pdf_content in results:
        if pdf_content:
            pdf_bytes_dict[order_id] = pdf_content
    
    successful = len(pdf_bytes_dict)
    logger.info(f"✓ Downloaded {successful}/{len(new_orders)} PDFs successfully")
    return pdf_bytes_dict


def remove_deleted_orders(deleted_orders):
    """
    Remove deleted orders from database
    (no PDF archiving - all files are in-memory now)
    """
    if not deleted_orders:
        logger.info("✓ No deleted orders to remove")
        return True
    
    logger.info(f"🗑️  Removing {len(deleted_orders)} deleted orders...")
    
    # Get fresh connection for this thread
    conn = db.get_connection()
    cursor = conn.cursor()
    
    removed_count = 0
    for order_id in deleted_orders:
        try:
            # Delete from database only (no file archiving needed)
            cursor.execute("DELETE FROM order_items WHERE order_number = ?", (order_id,))
            cursor.execute("DELETE FROM orders WHERE order_number = ?", (order_id,))
            conn.commit()
            logger.info(f"  ✓ Deleted {order_id} from DB")
            removed_count += 1
            
        except Exception as e:
            logger.error(f"  ❌ Error removing {order_id}: {str(e)}")
    
    conn.close()
    logger.info(f"✓ Removed {removed_count}/{len(deleted_orders)} orders")
    return True


def update_database_from_pdfs(downloaded_pdfs, affected_orders):
    """
    Extract data from in-memory PDF bytes and update database
    downloaded_pdfs = {order_id: pdf_bytes} dict from download_pdfs()
    affected_orders = new_orders + deleted_orders
    """
    logger.info("📊 Updating database from PDF bytes...")
    
    try:
        # Get fresh connection for this thread (thread-safe)
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Clear old data for affected orders
        for order_id in affected_orders:
            try:
                cursor.execute("DELETE FROM order_items WHERE order_number = ?", (order_id,))
                cursor.execute("DELETE FROM orders WHERE order_number = ?", (order_id,))
                conn.commit()
            except Exception as e:
                logger.warning(f"  ⚠️ Error clearing {order_id}: {str(e)}")
        
        # Extract from downloaded PDF bytes
        logger.info(f"📝 Extracting data from {len(downloaded_pdfs)} PDFs...")
        
        extracted_count = 0
        error_count = 0
        
        for order_id, pdf_bytes in downloaded_pdfs.items():
            try:
                from backend.pdf_extractor import extract_order_from_pdf_bytes
                order_data = extract_order_from_pdf_bytes(pdf_bytes, order_id)
                
                if not order_data or not order_data.get('items'):
                    logger.warning(f"  ⚠️ No data from {order_id}")
                    error_count += 1
                    continue
                
                # Insert order header
                cursor.execute("""
                    INSERT OR REPLACE INTO orders 
                    (order_number, reference, order_date, delivery_date, status, client, customer_code, address, depot)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    order_id,
                    order_data.get('reference', ''),
                    order_data.get('order_date', ''),
                    order_data.get('delivery_date', ''),
                    order_data.get('status', 'à préparer'),
                    order_data.get('client', ''),
                    order_data.get('customer_code', ''),
                    order_data.get('address', ''),
                    order_data.get('depot', '')
                ))
                
                # Insert items
                for item in order_data.get('items', []):
                    cursor.execute("""
                        INSERT INTO order_items 
                        (order_number, barcode, reference, description, quantity, warehouse_location, stock)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        order_id,
                        item.get('barcode', ''),
                        item.get('reference', ''),
                        item.get('description', ''),
                        item.get('quantity', 0),
                        item.get('location', 'XXXXXX'),
                        item.get('stock', 0)
                    ))
                
                conn.commit()
                extracted_count += 1
                logger.info(f"  ✓ Extracted {order_id} ({len(order_data.get('items', []))} items)")
                
            except Exception as e:
                error_count += 1
                logger.error(f"  ❌ Error extracting {order_id}: {str(e)[:80]}")
        
        conn.close()
        logger.info(f"✓ Extracted {extracted_count}/{len(downloaded_pdfs)} PDFs successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Critical error updating database: {str(e)}")
        return False


@sync_bp.route('', methods=['POST', 'GET'])
def sync_orders():
    """
    Main sync endpoint - Full synchronization workflow
    
    Flow:
    1. Get online orders
    2. Get DB orders
    3. Find differences (new + deleted)
    4. Download new PDFs
    5. Remove deleted orders
    6. Update DB from PDFs
    
    Security: Requires SYNC_TOKEN header (unless in dev mode)
    """
    
    # Check auth token
    if not verify_sync_token(request):
        logger.warning("❌ Unauthorized sync attempt")
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid or missing sync token'}), 401
    
    start_time = datetime.now()
    sync_result = {
        'status': 'pending',
        'timestamp': start_time.isoformat(),
        'phase': 'starting',
        'added_orders': 0,
        'removed_orders': 0,
        'errors': []
    }
    
    try:
        # Phase 1: Get online orders
        sync_result['phase'] = 'fetching_online'
        logger.info("\n" + "="*80)
        logger.info("🔄 SYNC STARTED")
        logger.info("="*80)
        
        # Check if credentials are available
        if not has_credentials() and not USERNAME and not PASSWORD:
            logger.warning("⚠️ No credentials available - waiting for user login...")
            logger.warning("   To sync manually, login first, then trigger sync")
            sync_result['status'] = 'pending'
            sync_result['phase'] = 'waiting_for_credentials'
            sync_result['errors'].append('Waiting for user to login first')
            return jsonify(sync_result), 202  # Accepted but not processed yet
        
        logger.info(f"🔑 Using credentials: {has_credentials() and get_credentials()[0] or 'from environment'}")
        
        result = get_online_orders()
        if result is None:
            sync_result['status'] = 'error'
            sync_result['errors'].append('Failed to fetch online orders')
            logger.error("❌ Could not fetch online orders")
            return jsonify(sync_result), 500
        
        online_orders, driver = result
        session = requests.Session()
        for cookie in driver.get_cookies():
            session.cookies.set(cookie['name'], cookie['value'])
        driver.quit()
        
        # Phase 2: Get database orders
        sync_result['phase'] = 'fetching_database'
        db_orders = get_db_orders()
        logger.info(f"📦 DB has {len(db_orders)} orders")
        
        # Phase 3: Find differences
        sync_result['phase'] = 'comparing'
        new_orders = online_orders - db_orders
        deleted_orders = db_orders - online_orders
        
        sync_result['added_orders'] = len(new_orders)
        sync_result['removed_orders'] = len(deleted_orders)
        
        if new_orders:
            logger.info(f"✨ New orders: {', '.join(list(new_orders)[:5])}")
        if deleted_orders:
            logger.info(f"🗑️  Deleted orders: {', '.join(list(deleted_orders)[:5])}")
        
        # Phase 4: Download new PDFs (in-memory)
        sync_result['phase'] = 'downloading_pdfs'
        downloaded_pdfs = {}
        if new_orders:
            downloaded_pdfs = download_pdfs(new_orders, session)
            if not downloaded_pdfs and new_orders:
                sync_result['errors'].append('Some PDFs failed to download')
        
        # Phase 5: Remove deleted orders
        sync_result['phase'] = 'removing_deleted'
        if deleted_orders:
            remove_deleted_orders(deleted_orders)
        
        # Phase 6: Update database
        sync_result['phase'] = 'updating_database'
        affected_orders = new_orders | deleted_orders
        if downloaded_pdfs:
            update_database_from_pdfs(downloaded_pdfs, affected_orders)
        
        # Success!
        sync_result['status'] = 'success'
        sync_result['phase'] = 'completed'
        elapsed = (datetime.now() - start_time).total_seconds()
        sync_result['duration_seconds'] = elapsed
        
        logger.info("\n" + "="*80)
        logger.info(f"✅ SYNC COMPLETED SUCCESSFULLY in {elapsed:.1f}s")
        logger.info(f"   Added: {len(new_orders)} | Removed: {len(deleted_orders)}")
        logger.info("="*80 + "\n")
        
        return jsonify(sync_result), 200
        
    except Exception as e:
        sync_result['status'] = 'error'
        sync_result['errors'].append(str(e))
        logger.error(f"❌ Sync failed: {str(e)}")
        return jsonify(sync_result), 500


@sync_bp.route('/status', methods=['GET'])
def sync_status():
    """
    Get last sync status (for monitoring)
    """
    try:
        orders_count = len(db.get_orders())
        return jsonify({
            'status': 'ok',
            'orders_in_db': orders_count,
            'message': 'Database synced with online system (PDFs stored in-memory)'
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@sync_bp.route('/trigger', methods=['POST'])
def trigger_sync():
    """
    Manually trigger immediate sync (called from frontend after login)
    Returns immediately while sync runs in background thread
    """
    try:
        # Trigger sync in background thread (same as scheduler)
        import threading
        def sync_in_background():
            try:
                # Call sync directly without request context verification
                # (since we're already authenticated by login)
                result = {
                    'status': 'pending',
                    'timestamp': datetime.now().isoformat(),
                    'phase': 'starting',
                    'added_orders': 0,
                    'removed_orders': 0,
                    'errors': []
                }
                
                start_time = datetime.now()
                
                # Phase 1: Get online orders
                result['phase'] = 'fetching_online'
                logger.info("\n" + "="*80)
                logger.info("🔄 MANUAL SYNC TRIGGERED")
                logger.info("="*80)
                
                fetch_result = get_online_orders()
                if fetch_result is None:
                    logger.error("❌ Could not fetch online orders")
                    return
                
                online_orders, driver = fetch_result
                session = requests.Session()
                for cookie in driver.get_cookies():
                    session.cookies.set(cookie['name'], cookie['value'])
                driver.quit()
                
                # Phase 2: Get database orders
                result['phase'] = 'fetching_database'
                db_orders = get_db_orders()
                logger.info(f"📦 DB has {len(db_orders)} orders")
                
                # Phase 3: Find differences
                result['phase'] = 'comparing'
                new_orders = online_orders - db_orders
                deleted_orders = db_orders - online_orders
                
                result['added_orders'] = len(new_orders)
                result['removed_orders'] = len(deleted_orders)
                
                if new_orders:
                    logger.info(f"✨ New orders: {', '.join(list(new_orders)[:5])}")
                if deleted_orders:
                    logger.info(f"🗑️  Deleted orders: {', '.join(list(deleted_orders)[:5])}")
                
                # Phase 4: Download new PDFs
                result['phase'] = 'downloading_pdfs'
                downloaded_pdfs = {}
                if new_orders:
                    downloaded_pdfs = download_pdfs(new_orders, session)
                
                # Phase 5: Remove deleted orders
                result['phase'] = 'removing_deleted'
                if deleted_orders:
                    remove_deleted_orders(deleted_orders)
                
                # Phase 6: Update database
                result['phase'] = 'updating_database'
                affected_orders = new_orders | deleted_orders
                if affected_orders or downloaded_pdfs:
                    update_database_from_pdfs(downloaded_pdfs, affected_orders)
                
                elapsed = (datetime.now() - start_time).total_seconds()
                logger.info("\n" + "="*80)
                logger.info(f"✅ MANUAL SYNC COMPLETED in {elapsed:.1f}s")
                logger.info(f"   Added: {len(new_orders)} | Removed: {len(deleted_orders)}")
                logger.info("="*80 + "\n")
                
            except Exception as e:
                logger.error(f"❌ Manual sync failed: {str(e)}")
        
        # Run in background daemon thread
        sync_thread = threading.Thread(target=sync_in_background)
        sync_thread.daemon = True
        sync_thread.start()
        
        return jsonify({
            'success': True,
            'message': '🔄 Sync triggered! Data will update in background...',
            'status': 'syncing'
        }), 202  # 202 = Accepted (async operation)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
