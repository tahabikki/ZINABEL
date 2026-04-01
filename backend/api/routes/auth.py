from flask import Blueprint, jsonify, request, session
import sys
from pathlib import Path
import logging

# Add workspace root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.utils.online_system import login_to_online, setup_driver
from backend.credentials_manager import store_credentials, clear_credentials

auth_bp = Blueprint('auth', __name__)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store authenticated sessions temporarily
authenticated_sessions = {}


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user with online system
    Body: {username, password}
    Returns: {success, message, user}
    """
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        logger.info(f"🔐 Login attempt for user: {username}")
        
        # Attempt to login to online system
        driver = setup_driver()
        
        try:
            # Login with provided credentials (no module modification needed)
            success, msg = login_to_online(driver, user_username=username, user_password=password)

            if success:
                # Extract cookies for authenticated session
                cookies = driver.get_cookies()

                # Store in session (server-side)
                session_id = f"{username}_{int(__import__('time').time())}"
                authenticated_sessions[session_id] = {
                    'username': username,
                    'cookies': cookies,
                    'timestamp': __import__('datetime').datetime.now()
                }

                # Store session ID in Flask session
                session['auth_session_id'] = session_id
                session['username'] = username
                session['password'] = password  # Store for auto-sync to use
                session['authenticated'] = True

                # Store credentials globally for auto-sync
                store_credentials(username, password)

                logger.info(f"✅ Login successful for {username} - Auto-sync starting in background")

                # NOTE: PDFs will be fetched in background every minute
                # Login is fast - sync happens silently!

                return jsonify({
                    'success': True,
                    'message': f'✅ Logged in as {username}. Auto-sync starting in background...',
                    'user': {
                        'username': username,
                        'session_id': session_id
                    }
                }), 200
            else:
                logger.warning(f"❌ Login failed for {username}: {msg}")
                return jsonify({
                    'error': 'Authentication failed',
                    'message': msg or '❌ Invalid username or password'
                }), 401
                
        finally:
            driver.quit()
            
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        return jsonify({
            'error': 'Login error',
            'message': f'❌ {str(e)}'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout user and clear session
    """
    try:
        session_id = session.get('auth_session_id')
        username = session.get('username')
        
        if session_id and session_id in authenticated_sessions:
            del authenticated_sessions[session_id]
            logger.info(f"Logged out: {username}")
        
        # Clear stored credentials for auto-sync
        clear_credentials()
        
        session.clear()
        
        return jsonify({
            'success': True,
            'message': '✅ Logged out successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'error': 'Logout error',
            'message': str(e)
        }), 500


@auth_bp.route('/status', methods=['GET'])
def auth_status():
    """
    Check current authentication status
    """
    try:
        session_id = session.get('auth_session_id')
        username = session.get('username')
        
        if session_id and session_id in authenticated_sessions:
            auth_data = authenticated_sessions[session_id]
            return jsonify({
                'authenticated': True,
                'username': auth_data['username'],
                'message': f'✅ Authenticated as {auth_data["username"]}'
            }), 200
        else:
            return jsonify({
                'authenticated': False,
                'message': '❌ Not authenticated'
            }), 401
            
    except Exception as e:
        return jsonify({
            'authenticated': False,
            'error': str(e)
        }), 500


def get_authenticated_session():
    """
    Get the authenticated session for current user
    Used by sync service to get user credentials
    """
    try:
        session_id = session.get('auth_session_id')
        if session_id and session_id in authenticated_sessions:
            return authenticated_sessions[session_id]
    except:
        pass
    return None
