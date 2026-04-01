"""
Sync Scheduler Service
- Runs synchronization every minute
- Fetches online orders and updates database
- Handles background tasks
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging
import requests
from datetime import datetime
import sys
from pathlib import Path

# Add workspace root to path
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sync_scheduler = None
sync_stats = {
    'last_sync': None,
    'sync_count': 0,
    'last_error': None,
    'is_running': False,
    'total_orders': 0,
    'total_pdfs': 0
}


def run_sync():
    """
    Background sync task - runs every minute (SILENT - no visible activity)
    - Scraper uses headless mode (no browser window)
    - All actions happen in background
    """
    global sync_stats
    
    try:
        sync_stats['is_running'] = True
        logger.info("🔄 Auto-sync triggered (running silently in background...)")
        
        # Call the sync endpoint locally
        try:
            response = requests.post(
                'http://localhost:5000/api/sync',
                json={},
                headers={'Content-Type': 'application/json'},
                timeout=120
            )
            
            result = response.json()
            
            # Update statistics
            sync_stats['last_sync'] = datetime.now().isoformat()
            sync_stats['sync_count'] += 1
            
            if result.get('status') == 'success':
                logger.info(f"✅ Sync successful: +{result.get('added_orders', 0)} -{result.get('removed_orders', 0)} in {result.get('duration_seconds', 0):.1f}s")
                sync_stats['last_error'] = None
            else:
                logger.warning(f"⚠️ Sync completed with warnings: {result.get('errors')}")
                sync_stats['last_error'] = result.get('errors', ['Unknown error'])
                
        except requests.exceptions.ConnectionError:
            logger.error("❌ Could not connect to API - is it running?")
            sync_stats['last_error'] = ['Connection failed']
        except Exception as e:
            logger.error(f"❌ Sync request error: {str(e)}")
            sync_stats['last_error'] = [str(e)]
            
    except Exception as e:
        logger.error(f"❌ Critical sync error: {str(e)}")
        sync_stats['last_error'] = [str(e)]
    finally:
        sync_stats['is_running'] = False


def start_scheduler():
    """
    Start the background scheduler
    Runs sync every minute
    """
    global sync_scheduler
    
    if sync_scheduler is not None and sync_scheduler.running:
        logger.warning("⚠️ Scheduler already running")
        return
    
    try:
        sync_scheduler = BackgroundScheduler(daemon=True)
        
        # Add job: run every 2 minutes (120 seconds) for stable filtering and order detection
        sync_scheduler.add_job(
            run_sync,
            trigger=IntervalTrigger(seconds=120),
            id='auto_sync',
            name='Auto Sync with Online System',
            replace_existing=True,
            max_instances=1  # Prevent overlapping executions
        )
        
        sync_scheduler.start()
        logger.info("✅ Sync scheduler started - running every 2 minutes ⚡ (better filter detection + order sync)")
        
        # Run first sync immediately
        logger.info("🚀 Running initial sync...")
        run_sync()
        
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {str(e)}")
        raise


def stop_scheduler():
    """
    Stop the background scheduler
    """
    global sync_scheduler
    
    if sync_scheduler and sync_scheduler.running:
        try:
            sync_scheduler.shutdown()
            logger.info("✅ Scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping scheduler: {str(e)}")


def get_sync_stats():
    """
    Get current sync statistics
    """
    return sync_stats.copy()


def get_scheduler_status():
    """
    Get scheduler status
    """
    return {
        'scheduler_running': sync_scheduler is not None and sync_scheduler.running,
        'stats': get_sync_stats()
    }
