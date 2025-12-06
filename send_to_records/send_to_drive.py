#!/usr/bin/env python3
import sys
import os
from PIL import Image
import io
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import subprocess  # For xclip

def copy_image_to_clipboard(image_path):
    """Load image and copy to clipboard as PNG via xclip."""
    try:
        img = Image.open(image_path)
        output = io.BytesIO()
        img.convert('RGB').save(output, format='PNG')
        output.seek(0)
        png_bytes = output.getvalue()
        print(f"Generated PNG bytes: {len(png_bytes)}")
        
        # Pipe to xclip for image/png clipboard (Linux-friendly)
        process = subprocess.Popen(['xclip', '-selection', 'clipboard', '-t', 'image/png'], 
                                   stdin=subprocess.PIPE)
        process.communicate(input=png_bytes)
        process.wait()
        
        if process.returncode == 0:
            print(f"Copied {image_path} to clipboard as image/png")
        else:
            raise Exception("xclip failed")
    except Exception as e:
        print(f"Copy failed: {e}")
        sys.exit(1)

def paste_to_google_photos(album_url=None):
    """Open Photos (or album), wait, Ctrl+V, and auto-detect upload finish."""
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")  # Hide automation
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])  # No automation flag
    chrome_options.add_experimental_option('useAutomationExtension', False)  # Disable extension
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36")  # Normal UA
    chrome_options.add_argument("--user-data-dir=~/.config/google-chrome")  # Reuse your profile
    service = Service('/usr/local/bin/chromedriver')  # Your local driver
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Execute script to hide webdriver prop
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    try:
        # Navigate to album if provided, else general library
        url = album_url or "https://photos.google.com/?pli=1"
        driver.get(url)
        time.sleep(5)  # Bump to 5s for load/login
        
        body = driver.find_element(By.TAG_NAME, "body")
        body.click()
        body.send_keys(Keys.CONTROL + "v")
        print("Ctrl+V sent to Google Photos")
        
        # Auto-wait for upload complete
        wait_for_upload_complete(driver)
        print("Upload complete—closing browser in 5s...")
        time.sleep(5)  # Brief pause to see success
        
    except Exception as e:
        print(f"Selenium error: {e}")
    finally:
        driver.quit()

def wait_for_upload_complete(driver, timeout=30):
    """Poll for upload finish (progress gone, success toast)."""
    wait = WebDriverWait(driver, timeout)
    print("Waiting for upload to finish...")
    
    try:
        # Wait for initial progress to appear then disappear
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".upload-progress, [aria-label*='uploading']")))
        print("Upload started—monitoring progress...")
        
        # Wait for progress to vanish (upload done)
        wait.until_not(EC.presence_of_element_located((By.CSS_SELECTOR, ".upload-progress, [aria-label*='uploading'], .progress-bar")))
        
        # Confirm success (toast or added media item)
        wait.until(EC.any_of(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".toast-success, [data-tooltip*='uploaded']")),
            EC.presence_of_element_located((By.CSS_SELECTOR, ".media-item.new"))  # New item in grid
        ))
        print("Upload success detected!")
        
    except TimeoutException:
        print("Upload timeout—closing anyway.")
    except Exception as e:
        print(f"Wait error: {e} (continuing...)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 send_to_google_photos.py <image_path> [album_url]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    album_url = sys.argv[2] if len(sys.argv) > 2 else None  # Optional album URL
    
    if not os.path.exists(image_path):
        print("Image file not found!")
        sys.exit(1)
    
    copy_image_to_clipboard(image_path)
    paste_to_google_photos(album_url)