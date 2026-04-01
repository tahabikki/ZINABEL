#!/usr/bin/env python3
"""
ZINABEL DEBUG START - Shows what's happening
"""

import subprocess
import time
import sys
import os
import webbrowser
from pathlib import Path

os.chdir(Path(__file__).parent)

print("\n" + "="*80)
print("🎉 ZINABEL Dashboard Starting")
print("="*80)

print("\n⏳ Starting services...\n")

# Get the Python executable from venv
venv_python = Path('.venv/Scripts/python.exe') if sys.platform == 'win32' else Path('.venv/bin/python')

# Start Backend with venv Python
print("1️⃣  Starting Backend...")
backend = subprocess.Popen(
    [str(venv_python), 'backend/run_app.py']
)
print("   Backend PID:", backend.pid)

print("2️⃣  Waiting 5 seconds...")
time.sleep(5)

# Start Frontend
print("3️⃣  Starting Frontend...")
npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
frontend = subprocess.Popen(
    [npm_cmd, 'run', 'dev'],
    cwd='frontend'
)
print("   Frontend PID:", frontend.pid)

print("4️⃣  Waiting 5 seconds...")
time.sleep(5)

print("\n" + "="*80)
print("✨ READY!")
print("="*80)

print("\nOpening browser...")
webbrowser.open('http://localhost:3000')

print("\n✅ Services running!")
print("   Backend: http://localhost:5000")
print("   Frontend: http://localhost:3000")

print("\n🛑 Press Ctrl+C to stop\n")

try:
    backend.wait()
    frontend.wait()
except KeyboardInterrupt:
    print("\n🛑 Stopping...")
    backend.terminate()
    frontend.terminate()
    print("✅ Stopped")
