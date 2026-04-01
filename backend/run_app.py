#!/usr/bin/env python3
"""
Simple script to run the Flask app with proper setup
"""
import sys
from pathlib import Path
import os

# Ensure we're in the correct directory
os.chdir(Path(__file__).parent)
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

# Import and start the app
from app import create_app

print("\n" + "="*70)
print("🚀 Starting ZINABEL Backend API")
print("="*70 + "\n")

app = create_app()

# Show registered routes
print("📋 Registered Routes:")
print("-" * 70)
for rule in app.url_map.iter_rules():
    if rule.endpoint != 'static':
        print(f"  {str(rule).ljust(40)} → {rule.endpoint}")
print("-" * 70 + "\n")

# Show database stats
print("📊 Database Stats:")
print("-" * 70)
try:
    from database import db
    stats = db.get_stats()
    print(f"  Total Orders: {stats.get('total_orders', 0)}")
    print(f"  Total Products: {stats.get('total_products', 0)}")
    print(f"  Warehouse Locations: {stats.get('warehouse_locations', 0)}")
    print(f"  Pending Items: {stats.get('pending_items', 0)}")
except Exception as e:
    print(f"  ❌ Error: {e}")
print("-" * 70 + "\n")

print("✨ Backend ready on http://localhost:5000")
print("📱 Frontend ready on http://localhost:3000")
print("\nPress Ctrl+C to stop\n")

app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
