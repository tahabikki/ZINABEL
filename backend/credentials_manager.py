"""
Credentials Manager
- Stores login credentials from successful authentication
- Auto-sync retrieves these credentials to sync without user interaction
- No circular import issues
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Global credential storage
_stored_credentials = {
    'username': None,
    'password': None,
    'last_updated': None
}


def store_credentials(username, password):
    """Store credentials from successful login for auto-sync"""
    global _stored_credentials
    _stored_credentials['username'] = username
    _stored_credentials['password'] = password
    _stored_credentials['last_updated'] = datetime.now()
    logger.info(f"💾 Stored credentials for auto-sync: {username}")


def get_credentials():
    """Retrieve stored credentials for sync"""
    return _stored_credentials['username'], _stored_credentials['password']


def has_credentials():
    """Check if credentials are stored"""
    return bool(_stored_credentials['username'] and _stored_credentials['password'])


def clear_credentials():
    """Clear stored credentials on logout"""
    global _stored_credentials
    old_user = _stored_credentials['username']
    _stored_credentials['username'] = None
    _stored_credentials['password'] = None
    _stored_credentials['last_updated'] = None
    if old_user:
        logger.info(f"🗑️ Cleared credentials for user: {old_user}")


def get_credentials_info():
    """Get info about stored credentials (for debugging)"""
    return {
        'has_credentials': has_credentials(),
        'username': _stored_credentials['username'],
        'last_updated': _stored_credentials['last_updated'].isoformat() if _stored_credentials['last_updated'] else None
    }
