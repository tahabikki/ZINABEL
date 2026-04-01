"""
Shared module for querying the online system (onetechapp.ma)
Used by both scraper.py and backend API routes

⏳ TIMEOUT STRATEGY:
- WebDriverWait with explicit expected conditions checks for element presence/visibility
- Sequential time.sleep() waits between steps to allow page refresh/reload
- Smart pagination with page load confirmation before scraping
- Wait for filters visibility before filter operations
- Wait for cards/results visibility before data extraction

Timeline:
1. Navigate to URL → Wait 2s for page response
2. Apply first filter → Wait 5s for page refresh
3. Apply second filter → Wait 3s for results
4. Each pagination → Wait 3s for page load + 2s for stability
"""

import time
import os
import logging
import platform
from selenium.webdriver import Chrome  # type: ignore
from selenium.webdriver.common.by import By  # type: ignore
from selenium.webdriver.chrome.service import Service  # type: ignore
from selenium.webdriver.support.ui import WebDriverWait  # type: ignore
from selenium.webdriver.support import expected_conditions as EC  # type: ignore
from selenium.webdriver.chrome.options import Options  # type: ignore
from webdriver_manager.chrome import ChromeDriverManager  # type: ignore

# ===== CONFIG =====
CHROMEDRIVER_PATH = os.getenv('CHROMEDRIVER_PATH', '')
BRAVE_PATH = os.getenv('BRAVE_PATH', '')
USERNAME = os.getenv('ONLINE_USERNAME', '')
PASSWORD = os.getenv('ONLINE_PASSWORD', '')

# External system URLs - read from environment or use defaults
ONLINE_SYSTEM_URL = os.getenv('ONLINE_SYSTEM_URL', 'https://onetechapp.ma/sageb2b/')
ONLINE_SYSTEM_LOGIN_URL = os.getenv('ONLINE_SYSTEM_LOGIN_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=1')
ONLINE_SYSTEM_ORDERS_URL = os.getenv('ONLINE_SYSTEM_ORDERS_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=')
ONLINE_SYSTEM_PDF_URL = os.getenv('ONLINE_SYSTEM_PDF_URL', 'https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=')

logger = logging.getLogger(__name__)


def get_chromedriver_path():
    """Smart ChromeDriver detection: local project files > env var > webdriver-manager"""
    
    # Priority 1: Specified via environment variable
    if CHROMEDRIVER_PATH and os.path.exists(CHROMEDRIVER_PATH):
        logger.info(f"✅ Using CHROMEDRIVER_PATH: {CHROMEDRIVER_PATH}")
        return CHROMEDRIVER_PATH
    
    # Priority 2: Local project ChromeDriver (works for Windows and Docker/Linux)
    system = platform.system()
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    if system == "Windows":
        local_driver = os.path.join(project_root, 'ChromDriver manager', 'chromedriver-win64', 'chromedriver.exe')
    else:  # Linux/Docker
        local_driver = os.path.join(project_root, 'ChromDriver manager', 'chromedriver-linux64', 'chromedriver')
    
    if os.path.exists(local_driver):
        logger.info(f"✅ Using local ChromeDriver v146: {local_driver}")
        return local_driver
    
    # Priority 3: Let webdriver-manager auto-download
    logger.info("📥 Downloading ChromeDriver via webdriver-manager...")
    try:
        driver_path = ChromeDriverManager().install()
        logger.info(f"✅ Downloaded ChromeDriver: {driver_path}")
        return driver_path
    except Exception as e:
        logger.error(f"❌ Could not get ChromeDriver: {e}")
        raise


def setup_driver():  # type: ignore
    """Create and configure Selenium WebDriver - HEADLESS (no visible window)"""
    try:
        options = Options()
        
        if BRAVE_PATH:
            options.binary_location = BRAVE_PATH
            logger.info(f"🦁 Using Brave browser from: {BRAVE_PATH}")
        
        options.add_argument("--headless")  # Hide browser window
        options.add_argument("--no-sandbox")  # Silent mode
        options.add_argument("--disable-dev-shm-usage")  # Prevent memory issues
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")  # Hide automation
        
        logger.info("📥 Getting ChromeDriver v146...")
        chromedriver_path = get_chromedriver_path()
        
        service = Service(chromedriver_path)
        driver = Chrome(service=service, options=options)  # type: ignore
        logger.info("✅ Chrome driver initialized successfully")
        return driver
    except Exception as e:
        logger.error(f"❌ ChromeDriver setup failed: {str(e)}")
        logger.error("Make sure Brave is installed or ChromeDriver 146 is in project")
        raise


def login_to_online(driver, user_username=None, user_password=None):
    """Login to the online system with multiple selector fallbacks.

    Returns (success: bool, message: str). On failure a screenshot and
    any visible error text will be saved/logged to help debugging.
    """
    # Use provided credentials or fall back to module defaults
    username = user_username if user_username else USERNAME
    password = user_password if user_password else PASSWORD

    logger.info("🔐 Logging in...")
    driver.get(ONLINE_SYSTEM_URL)

    # Wait briefly for page to respond
    try:
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return document.readyState") in ("interactive", "complete")
        )
    except Exception:
        logger.debug("Page readyState did not reach interactive/complete quickly")

    # Helper to try multiple selectors
    def try_find_and_type(selectors, value, delay=0.2):
        for sel in selectors:
            try:
                el = WebDriverWait(driver, 5).until(EC.element_to_be_clickable(sel))
                el.clear()
                el.send_keys(value)
                time.sleep(delay)
                return True
            except Exception:
                continue
        return False

    # Candidate selectors for username/email/login input
    user_selectors = [
        (By.ID, "login"),
        (By.ID, "username"),
        (By.NAME, "login"),
        (By.NAME, "username"),
        (By.NAME, "email"),
        (By.CSS_SELECTOR, "input[type='text']"),
        (By.CSS_SELECTOR, "input[type='email']")
    ]

    # Candidate selectors for password input
    pass_selectors = [
        (By.ID, "password"),
        (By.NAME, "password"),
        (By.NAME, "passwd"),
        (By.CSS_SELECTOR, "input[type='password']")
    ]

    if not username or not password:
        msg = "No credentials provided"
        logger.warning(msg)
        return False, msg

    # Fill username
    if not try_find_and_type(user_selectors, username):
        logger.warning("Could not find username input using known selectors")

    # Fill password
    if not try_find_and_type(pass_selectors, password):
        logger.warning("Could not find password input using known selectors")

    # Try to submit the form using common submit buttons
    submit_selectors = [
        (By.CSS_SELECTOR, "button[type='submit']"),
        (By.CSS_SELECTOR, "input[type='submit']"),
        (By.XPATH, "//button[contains(text(), 'Se connecter') or contains(text(), 'Connexion') or contains(text(), 'Login') or contains(text(), 'Sign in')]")
    ]

    clicked = False
    for sel in submit_selectors:
        try:
            btn = WebDriverWait(driver, 3).until(EC.element_to_be_clickable(sel))
            btn.click()
            clicked = True
            logger.info("✓ Submitted login form via selector %s", str(sel))
            break
        except Exception:
            continue

    if not clicked:
        # As a last resort try pressing Enter in the password field
        try:
            for sel in pass_selectors:
                try:
                    pwd_el = driver.find_element(*sel)
                    pwd_el.send_keys('\n')
                    logger.info("✓ Sent Enter to password field to submit")
                    clicked = True
                    break
                except Exception:
                    continue
        except Exception:
            logger.warning("Could not programmatically submit the login form")

    # Wait for either a successful login indicator or an error
    try:
        # success indicators
        WebDriverWait(driver, 20).until(
            lambda d: (
                'accueil' in d.current_url or
                d.find_elements(By.CLASS_NAME, 'navbar') or
                d.find_elements(By.CLASS_NAME, 'navbar-collapse')
            )
        )
        logger.info("✓ Login appears successful (navbar/redirect detected)")
        time.sleep(1)
        return True, 'Login successful'
    except Exception:
        # Collect any visible error messages
        error_texts = []
        try:
            alerts = driver.find_elements(By.CSS_SELECTOR, '.alert, .error, .help-block, .invalid-feedback')
            for a in alerts:
                txt = a.text.strip()
                if txt:
                    error_texts.append(txt)
        except Exception:
            pass

        # Save a screenshot for debugging
        try:
            ts = int(time.time())
            screenshot_path = f"/tmp/login_error_{ts}.png"
            driver.save_screenshot(screenshot_path)
            logger.warning(f"Saved login failure screenshot: {screenshot_path}")
        except Exception as e:
            logger.warning(f"Could not save screenshot: {e}")

        msg = ' / '.join(error_texts) if error_texts else 'Login failed: unknown reason (see screenshot)'
        logger.warning(msg)
        return False, msg


def navigate_to_commandes(driver):
    """Navigate to the commandes page"""
    print("📄 Navigating to commandes...")
    
    try:
        # Click navbar toggler (hamburger menu)
        toggler = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "navbar-toggler"))
        )
        toggler.click()
        print("✓ Navbar opened")
        time.sleep(1)
        
        # Click the "Préparation de livraison" link
        link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'preparation_livraison')]"))
        )
        link.click()
        print("✓ Navigation link clicked")
        
        # Wait for commandes page to fully load - wait for filters to appear
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "type_doc"))
        )
        print("✓ Commandes page loaded (filters visible)")
        time.sleep(2)
        return True
    except Exception as e:
        print(f"✗ Navigation failed: {e}")
        print("Trying direct navigation...")
        driver.get(ONLINE_SYSTEM_LOGIN_URL)
        
        # Wait for filters to load on direct navigation
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "type_doc"))
        )
        print("✓ Direct navigation successful")
        time.sleep(2)
        return True


def set_filters(driver):
    """Apply filters: Commande type + All statuses"""
    print("🔍 Setting filters...")
    
    try:
        # Wait for filters to be present and visible
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "type_doc"))
        )
        WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.ID, "type_doc"))
        )
        print("✓ Filters found and visible")
        time.sleep(1)
        
        # Select "Commande" from type_doc dropdown
        type_doc_select = driver.find_element(By.ID, "type_doc")
        type_doc_select.click()
        print("✓ Opened type_doc dropdown")
        time.sleep(1)
        
        commande_option = driver.find_element(By.XPATH, "//select[@id='type_doc']/option[@value='Commande']")
        commande_option.click()
        print("✓ Selected: Commande")
        time.sleep(1)
        
        # ⏳ WAIT LONGER FOR FULL PAGE REFRESH after first filter click
        print("⏳ Waiting for page to fully refresh after Commande filter...")
        time.sleep(3)  # Extra wait for page to reload completely
        
        try:
            # Wait for loading overlay to disappear (if it exists)
            loading_overlay = WebDriverWait(driver, 20).until(
                EC.invisibility_of_element_located((By.ID, "loading"))
            )
            print("✓ Loading overlay disappeared")
        except:
            print("⚠️ No loading overlay or already gone")
        
        # Wait for results to appear (indicates data loaded)
        print("⏳ Waiting for results to load...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".card"))
            )
            print("✓ Results visible - page ready for next filter")
        except:
            print("⚠️ Results not loading (may have no data)")
        
        # CRITICAL: Extra stabilization wait before attempting second filter
        print("⏳ Stabilizing page before applying second filter...") 
        time.sleep(2)
        
        # Now wait for status filter to be clickable
        print("⏳ Waiting for status filter to become clickable...")
        WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.ID, "statut_search"))
        )
        print("✓ Status filter ready")
        time.sleep(1)
        
        # Select "-- Tous les statuts --" (all statuses)
        statut_select = driver.find_element(By.ID, "statut_search")
        statut_select.click()
        print("✓ Opened statut_search dropdown")
        time.sleep(1)
        
        all_statuts_option = driver.find_element(By.XPATH, "//select[@id='statut_search']/option[@value='']")
        all_statuts_option.click()
        print("✓ Selected: -- Tous les statuts --")
        time.sleep(1)
        
        # ⏳ WAIT FOR RESULTS TO LOAD after status filter
        print("⏳ Waiting for results to load...")
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".card"))
        )
        print("✓ Results loaded (cards visible)")
        time.sleep(3)
        
        print("✓ All filters applied successfully")
        return True
    except Exception as e:
        print(f"✗ Error setting filters: {e}")
        return False


def scrape_pieces(driver, max_pages=100):
    """Scrape all piece IDs from online system"""
    print("📦 Scraping pieces...")
    all_pieces = []
    
    for page_offset in range(0, max_pages):
        page = 1 + page_offset
        print(f"\n--- Page {page} ---")
        
        if page_offset > 0:
            # Navigate to next page
            url = f"{ONLINE_SYSTEM_ORDERS_URL}{page}"
            print(f"📍 Navigating to: {url}")
            driver.get(url)
            print("✓ Page requested")
            
            # ⏳ WAIT FOR PAGE TO FULLY LOAD
            print(f"⏳ Waiting for page {page} to load...")
            time.sleep(3)
            
            # Wait for cards to appear on the page
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".card"))
                )
                print(f"✓ Page {page} loaded (cards visible)")
            except:
                print(f"✗ No cards found on page {page} - possible error page")
                if "erreur" in driver.current_url:
                    print("✗ Error page detected - ending pagination")
                    break
                else:
                    print("⚠ Continuing to next page...")
                    continue
            
            # Additional wait to ensure all content is stable
            time.sleep(2)
            
            if "erreur" in driver.current_url:
                print("✗ Error page - ending pagination")
                break
        
        try:
            # Wait for cards on first page too
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".card"))
            )
            print("✓ Cards found")
        except:
            print("✗ No cards found - end of pages")
            break
        
        cards = driver.find_elements(By.CSS_SELECTOR, ".card")
        print(f"Found {len(cards)} cards on page {page}")
        
        if not cards:
            break
        
        for card in cards:
            try:
                link = card.find_element(By.CSS_SELECTOR, "a.stretched-link")
                href = link.get_attribute("href")
                
                if "bc=" in href:
                    piece_id = href.split("bc=")[1]
                    if piece_id.startswith("PL"):
                        all_pieces.append(piece_id)
                        print(f"  ✓ Found: {piece_id}")
            except:
                pass
    
    all_pieces = list(set(all_pieces))
    print(f"\n✓ Total collected: {len(all_pieces)} pieces")
    return all_pieces


def get_current_orders_from_online():
    """Query online system and return current order IDs"""
    driver = None
    try:
        driver = setup_driver()
        
        success, msg = login_to_online(driver)
        if not success:
            logger.error(f"Login failed: {msg}")
            return []
        
        if not navigate_to_commandes(driver):
            return []
        
        if not set_filters(driver):
            return []
        
        pieces = scrape_pieces(driver)
        return pieces
    except Exception as e:
        print(f"✗ Error: {e}")
        return []
    finally:
        if driver:
            driver.quit()
