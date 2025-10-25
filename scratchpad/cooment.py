import csv
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging

# Setup logging for debugging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Setup Selenium with Chrome
options = Options()
# options.add_argument("--headless")  # Uncomment for headless mode after debugging
options.add_argument("--no-sandbox")  # Required for Linux environments
options.add_argument("--disable-dev-shm-usage")  # Avoids issues in low-memory environments
options.add_argument("--blink-settings=imagesEnabled=false")  # Disable images to speed up load

# Path to manually downloaded chromedriver
chromedriver_path = "/home/c/Code/gh/vipderma.ir/chromedriver"

try:
    service = Service(executable_path=chromedriver_path)
    driver = webdriver.Chrome(service=service, options=options)
    driver.set_page_load_timeout(10)  # Set page load timeout
    logging.info("ChromeDriver started successfully")
except Exception as e:
    logging.error(f"Failed to start ChromeDriver: {e}")
    raise

# URL of the product page
url = "https://vipderma.ir/shop/%D9%BE%D9%88%D8%B3%D8%AA/P47649-%DA%A9%D8%B7%D9%85-%D9%85%D9%88%D8%A8%D8%B1-%D9%86%DB%8C%D8%B1-%D8%AD%D8%A7%D9%88%DB%8C-%D8%A2%D9%84%D9%88%D8%A6%D9%87-%D9%88%D8%B1%D8%A7-%D8%A8%D8%B1%D8%A7%DB%8C-%D9%BE%D8%A7-%D9%88-%D8%A8%D8%AF%D9%86-110-%DA%AF%D8%B1%D9%85%DB%8C-nair-hear-remover-cream-body-and-leg.html"

# Path to your CSV file (ensure UTF-8 encoded for Farsi)
csv_file = "beauty_comments.csv"

# Function to submit a comment
def submit_comment(name, title, content):
    try:
        logging.info(f"Submitting comment: {title} by {name}")
        try:
            driver.get(url)
        except Exception as e:
            logging.warning(f"Page load timed out: {e}. Stopping load and proceeding.")
            driver.execute_script("window.stop();")  # Force stop page load
        
        # Scroll to "ثبت نظر" button and ensure it's in view
        try:
            button = driver.find_element(By.ID, "wz-shop-comment-from-open")
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
            time.sleep(1)  # Wait for scroll
            # Wait for button to be clickable (max 10 seconds)
            WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "wz-shop-comment-from-open")))
            try:
                button.click()
                logging.info("Clicked 'ثبت نظر' button using standard click")
            except Exception as e:
                logging.warning(f"Standard click failed: {e}. Attempting JavaScript click.")
                driver.execute_script("arguments[0].click();", button)
                logging.info("Clicked 'ثبت نظر' button using JavaScript")
            time.sleep(1)  # Wait for form to appear
        except Exception as e:
            logging.error(f"Failed to click 'ثبت نظر' button: {e}")
            return
        
        # Fill form fields - UPDATE THESE SELECTORS after inspecting the page
        try:
            driver.find_element(By.NAME, "author").send_keys(name)
            logging.info("Filled author field")
        except Exception as e:
            logging.error(f"Failed to fill author field: {e}")
            return
        
        try:
            driver.find_element(By.NAME, "title").send_keys(title)
            logging.info("Filled title field")
        except Exception as e:
            logging.warning(f"Title field not found, skipping: {e}")
        
        try:
            driver.find_element(By.NAME, "comment").send_keys(content)
            logging.info("Filled comment field")
        except Exception as e:
            logging.error(f"Failed to fill comment field: {e}")
            return
        
        try:
            driver.find_element(By.CSS_SELECTOR, "input[type='radio'][value='5']").click()
            logging.info("Selected 5-star rating")
        except Exception as e:
            logging.warning(f"Rating field not found, skipping: {e}")
        
        try:
            driver.find_element(By.ID, "submit").click()
            logging.info("Clicked submit button")
        except Exception as e:
            logging.error(f"Failed to click submit button: {e}")
            return
        
        time.sleep(3)  # Wait for submission
        logging.info(f"Successfully submitted comment: {title} by {name}")
    except Exception as e:
        logging.error(f"Error submitting comment for {name}: {e}")

# Check if CSV file exists
if not os.path.exists(csv_file):
    logging.error(f"CSV file {csv_file} not found")
    raise FileNotFoundError(f"CSV file {csv_file} not found")

# Read CSV and submit each comment
try:
    with open(csv_file, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        # Verify CSV headers
        expected_headers = ['name', 'title of comment', 'content of comment']
        if reader.fieldnames != expected_headers:
            logging.error(f"Invalid CSV headers. Expected: {expected_headers}, Got: {reader.fieldnames}")
            raise ValueError(f"Invalid CSV headers. Expected: {expected_headers}")
        for row in reader:
            name = row['name']
            title = row['title of comment']
            content = row['content of comment']
            submit_comment(name, title, content)
            time.sleep(5)  # Delay to avoid spam detection
except Exception as e:
    logging.error(f"Error reading CSV file: {e}")
    raise

# Close the browser
driver.quit()
logging.info("Browser closed")